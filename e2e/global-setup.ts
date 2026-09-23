// Resolves which Supabase project the site under test talks to, refuses to run against the
// wrong one, sets the preview bypass cookie (preview origin only) and, when CMS writes are
// allowed, logs the E2E test admin in once.
import fs from "node:fs";
import path from "node:path";
import { chromium, type FullConfig } from "@playwright/test";
import { BASE_URL, BASE_ORIGIN, CURRENT_ENV, NEW_REF, PROD_ORIGIN, REPO, RUN_FILE, RUN_ID, T0, previewHeaders, secrets, type RunInfo } from "./support/env";

const REF_RE = /https:\/\/([a-z0-9]{20})\.supabase\.co/g;

async function bundleRefs(origin: string): Promise<{ bundle: string; refs: string[] }> {
  const html = await (await fetch(`${origin}/`, { headers: previewHeaders(origin) })).text();
  const bundle = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0];
  if (!bundle) throw new Error(`no index bundle found on ${origin}`);
  const js = await (await fetch(`${origin}${bundle}`, { headers: previewHeaders(origin) })).text();
  return { bundle, refs: [...new Set([...js.matchAll(REF_RE)].map((m) => m[1]))] };
}

export default async function globalSetup(_config: FullConfig) {
  const expected = process.env.EXPECTED_SUPABASE_REF;
  const forbidden = process.env.FORBIDDEN_SUPABASE_REF;
  if (!expected || !forbidden) throw new Error("EXPECTED_SUPABASE_REF and FORBIDDEN_SUPABASE_REF are required (never derived from .env)");
  if (expected === forbidden) throw new Error("EXPECTED and FORBIDDEN refs must differ");

  const authDir = path.join(REPO, "e2e/.auth");
  fs.mkdirSync(authDir, { recursive: true });
  const statePath = path.join(authDir, "state.json");

  // Bypass cookie for a protected preview, scoped to that origin only.
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext();
    if (CURRENT_ENV === "P") {
      const secret = secrets.VERCEL_AUTOMATION_BYPASS_SECRET;
      const r = await ctx.request.get(`${BASE_ORIGIN}/?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=${encodeURIComponent(secret)}`, { maxRedirects: 0 });
      if (r.status() >= 400) throw new Error(`bypass cookie request failed: ${r.status()}`);
    }
    await ctx.storageState({ path: statePath });

    const { bundle, refs } = await bundleRefs(BASE_ORIGIN);
    if (refs.length !== 1) throw new Error(`bundle names ${refs.length} Supabase hosts (${refs.join(",")}), expected exactly 1`);
    const targetRef = refs[0];
    if (targetRef !== expected) throw new Error(`target ref ${targetRef} != EXPECTED_SUPABASE_REF ${expected}`);
    if (targetRef === forbidden) throw new Error("target is the FORBIDDEN ref");
    // Cross-check with the REST response header.
    const probe = await fetch(`https://${targetRef}.supabase.co/rest/v1/gigs?select=id&limit=1`, {
      headers: { apikey: targetRef === NEW_REF ? secrets.NEW_PUB : secrets.OLD_ANON },
    });
    const hdrRef = probe.headers.get("sb-project-ref");
    if (hdrRef && hdrRef !== targetRef) throw new Error(`sb-project-ref ${hdrRef} != ${targetRef}`);

    const prodRef = CURRENT_ENV === "prod" ? targetRef : (await bundleRefs(PROD_ORIGIN)).refs[0];
    // CMS writes only against the new DB before it is production's DB (C.0 @cms-write guard).
    const allowCmsWrite =
      targetRef === NEW_REF && (prodRef !== NEW_REF || (process.env.ALLOW_PROD_WRITES === "1" && secrets.PA_PROD_TEST_WRITES === "yes"));

    const info: RunInfo = { targetRef, prodRef, bundle, env: CURRENT_ENV, allowCmsWrite, runId: RUN_ID, t0: T0 };
    fs.writeFileSync(RUN_FILE, JSON.stringify(info, null, 1));

    // Test admin session for @cms-write tests (never Heidi's or the developer's account).
    const adminState = path.join(authDir, "admin.json");
    // Always present so the spec structure doesn't depend on it; without a login it holds only the bypass cookie.
    fs.copyFileSync(statePath, adminState);
    if (allowCmsWrite && secrets.TEST_ADMIN_EMAIL && process.env.SKIP_ADMIN_LOGIN !== "1") {
      const actx = await browser.newContext({ storageState: statePath, baseURL: BASE_URL });
      const page = await actx.newPage();
      await page.goto("/login");
      await page.getByPlaceholder("Sähköposti").fill(secrets.TEST_ADMIN_EMAIL);
      await page.getByPlaceholder("••••••••").fill(secrets.TEST_ADMIN_PASSWORD);
      await page.getByRole("button", { name: /kirjaudu/i }).click();
      await page.waitForURL(/\/admin$/, { timeout: 30_000 });
      await actx.storageState({ path: adminState });
      await actx.close();
    }
    console.log(`[global-setup] env=${CURRENT_ENV} target=${targetRef} prod=${prodRef} bundle=${bundle} cmsWrite=${allowCmsWrite}`);
  } finally {
    await browser.close();
  }
}
