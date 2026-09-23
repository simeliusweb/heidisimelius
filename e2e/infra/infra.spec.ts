// Infrastructure and security: E1, E2/E20, E4/E12/E13/E14/E15/E19/E24 (probes), E5, E6, E8, E9, E16, E17, E18, E21.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { spec, expect, record, test } from "../support/fixtures";
import { BASE_URL, CURRENT_ENV, NEW_REF, OLD_REF, REPO, STATE, previewHeaders, secrets } from "../support/env";

const site = (p: string, init: RequestInit = {}) => {
  const url = `${BASE_URL}${p}`;
  return fetch(url, { redirect: "manual", ...init, headers: { ...previewHeaders(url), ...(init.headers as Record<string, string>) } });
};

/** The CRON_SECRET the deployment under test uses: a per-deploy random value on previews (CRON_SECRET_TEST), the real one on prod. */
const cronSecret = () => (CURRENT_ENV === "P" ? process.env.CRON_SECRET_TEST : process.env.CRON_SECRET || secrets.CRON_SECRET) || "";

spec({ id: "E1", title: "keep-db-alive: 200 with the secret, 401 without", tier: "gate", env: ["P", "prod"], data: "read", smoke: true }, async (_args, info) => {
  expect((await site("/api/keep-db-alive")).status).toBe(401);
  const s = cronSecret();
  if (!s) {
    record(info, "200-check", CURRENT_ENV === "prod" ? "CRON_SECRET unknown to the agent: use the dashboard cron Run button (AGENT-BR)" : "set CRON_SECRET_TEST to the preview's --env CRON_SECRET");
    test.skip(true, "no cron secret for the 200 check");
  }
  const r = await site("/api/keep-db-alive", { headers: { Authorization: `Bearer ${s}` } });
  expect(r.status).toBe(200);
  expect((await r.json()).message).toMatch(/^Pinged Supabase/);
});

spec({ id: "E8", title: "keep-alive auth matrix fails closed", tier: "gate", env: ["P", "prod"], data: "read" }, async (_args, info) => {
  expect((await site("/api/keep-db-alive")).status).toBe(401);
  expect((await site("/api/keep-db-alive", { headers: { Authorization: "Bearer wrong" } })).status).toBe(401);
  expect((await site("/api/keep-db-alive", { headers: { Authorization: "Bearer " } })).status).toBe(401);
  const body = await (await site("/api/keep-db-alive", { headers: { Authorization: "Bearer wrong" } })).text();
  expect(body).not.toMatch(/supabase\.co|Supabase responded/);
  if (process.env.E8_UNSET_BASE_URL) {
    // A preview deployed without CRON_SECRET must refuse even an empty bearer.
    const u = `${process.env.E8_UNSET_BASE_URL}/api/keep-db-alive`;
    expect((await fetch(u, { headers: { ...previewHeaders(u), Authorization: "Bearer undefined" } })).status).toBe(401);
  } else record(info, "unset-secret case", "needs a preview deployed without CRON_SECRET (E8_UNSET_BASE_URL)");
});

spec({ id: "E9", title: "keep-alive failure paths return a generic 500", tier: "regression", env: ["P"], data: "read" }, async (_args, info) => {
  const u = process.env.E9_BASE_URL;
  test.skip(!u, "needs a preview deployed with a wrong VITE_SUPABASE_URL (E9_BASE_URL + CRON_SECRET_TEST)");
  const url = `${u}/api/keep-db-alive`;
  const r = await fetch(url, { headers: { ...previewHeaders(url), Authorization: `Bearer ${process.env.CRON_SECRET_TEST}` } });
  expect(r.status).toBe(500);
  const t = await r.text();
  expect(t).not.toMatch(/supabase\.co|responded \d/);
  record(info, "body", t);
});

const vercel = async (p: string) => {
  const r = await fetch(`https://api.vercel.com${p}${p.includes("?") ? "&" : "?"}teamId=${secrets.VERCEL_ORG_ID}`, { headers: { Authorization: `Bearer ${secrets.VERCEL_TOKEN}` } });
  if (r.status === 401) throw new Error("STOP-ALL: 401 from the Vercel token");
  return r.json();
};

spec({ id: "E20", title: "env vars per scope (names and targets only)", tier: "gate", env: ["direct"], data: "read", extraTags: ["@E2"] }, async (_args, info) => {
  const { envs } = (await vercel(`/v9/projects/${secrets.VERCEL_PROJECT_ID}/env`)) as { envs: { key: string; target: string[]; type: string; updatedAt: number }[] };
  const summary = envs.map((e) => ({ key: e.key, target: [...e.target].sort().join(","), type: e.type, updated: new Date(e.updatedAt).toISOString() }));
  record(info, "env", summary);
  for (const k of ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"]) {
    for (const t of ["production", "preview"]) expect(envs.some((e) => e.key === k && e.target.includes(t)), `${k} in ${t}`).toBe(true);
  }
  const cron = envs.filter((e) => e.key === "CRON_SECRET");
  expect(cron.some((e) => e.target.includes("production"))).toBe(true);
  for (const c of cron) expect(["sensitive", "encrypted", "secret"]).toContain(c.type);
  expect(envs.filter((e) => /SERVICE_ROLE|SB_SECRET/i.test(e.key)).map((e) => e.key)).toEqual([]);
  expect(envs.filter((e) => e.key.startsWith("VITE_") && /SECRET|SERVICE|BREVO|CRON/i.test(e.key)).map((e) => e.key)).toEqual([]);
});

spec({ id: "E-probes", title: "security probes E4 E12 E13 E14 E15 E19 E24 B5 B22 (probes.mjs)", tier: "gate", env: ["direct"], data: "test-rows", extraTags: ["@E4", "@E12", "@E13", "@E14", "@E15", "@E19", "@E24", "@B5", "@B22"] }, async ({ run }, info) => {
  test.skip(run.targetRef !== NEW_REF, "probes only run against the new project");
  test.setTimeout(300_000);
  const out = execFileSync("node", ["scripts/migration/probes.mjs", "--project", "new"], { cwd: REPO, encoding: "utf8" });
  const line = out.split("\n").find((l) => l.startsWith("RESULT probes"))!;
  record(info, "probes", line);
  expect(line).toMatch(/^RESULT probes ok/);
});

spec({ id: "E5", title: "auth config = 2B.1", tier: "gate", env: ["direct"], data: "read" }, async () => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${NEW_REF}/config/auth`, { headers: { Authorization: `Bearer ${secrets.SUPABASE_PAT}` } });
  if (r.status === 401) throw new Error("STOP-ALL: 401 from the Supabase PAT");
  const c = await r.json();
  expect({
    disable_signup: c.disable_signup,
    anon: c.external_anonymous_users_enabled,
    email: c.external_email_enabled,
    autoconfirm: c.mailer_autoconfirm,
    linking: c.security_manual_linking_enabled,
    site_url: c.site_url,
    rotation: c.refresh_token_rotation_enabled,
    jwt_exp: c.jwt_exp,
    min: c.password_min_length,
  }).toEqual({ disable_signup: true, anon: false, email: true, autoconfirm: false, linking: false, site_url: "https://www.heidisimelius.fi", rotation: true, jwt_exp: 3600, min: 12 });
  expect(String(c.uri_allow_list)).toContain("https://www.heidisimelius.fi/**");
});

spec({ id: "E6", title: "storage cache-control on both projects (ranged GET)", tier: "gate", env: ["direct"], data: "read" }, async () => {
  const objs = ["documents/cv/CV-Simelius-Heidi.pdf"];
  const manifest = path.join(STATE, "exports/storage-mirror/manifest.json");
  if (fs.existsSync(manifest)) objs.push(...Object.keys(JSON.parse(fs.readFileSync(manifest, "utf8"))).filter((k) => !k.endsWith(".zip")).slice(0, 8));
  for (const ref of [OLD_REF, NEW_REF]) {
    for (const o of objs) {
      const r = await fetch(`https://${ref}.supabase.co/storage/v1/object/public/${o}`, { headers: { Range: "bytes=0-0" } });
      await r.arrayBuffer();
      expect(r.headers.get("cache-control"), `${ref} ${o}`).toBe("max-age=3600");
    }
  }
});

async function bundleChunks(): Promise<{ url: string; text: string }[]> {
  const html = await (await site("/")).text();
  const first = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1]);
  const seen = new Set<string>();
  const out: { url: string; text: string }[] = [];
  const queue = [...first];
  while (queue.length) {
    const p = queue.shift()!;
    if (seen.has(p)) continue;
    seen.add(p);
    const text = await (await site(p)).text();
    out.push({ url: p, text });
    for (const m of text.matchAll(/["'`](?:\.\/|\/assets\/)([A-Za-z0-9_-]+-[A-Za-z0-9_-]{8}\.js)["'`]/g)) queue.push(`/assets/${m[1]}`);
  }
  return out;
}

spec({ id: "E16", title: "no secrets in any bundle chunk or in git history", tier: "gate", env: ["P", "prod"], data: "read" }, async ({ run }) => {
  const chunks = await bundleChunks();
  expect(chunks.length).toBeGreaterThan(0);
  const all = chunks.map((c) => c.text).join("\n");
  expect(all).not.toMatch(/sb_secret_/);
  expect(all).not.toMatch(/xkeysib-/);
  for (const s of [process.env.CRON_SECRET_TEST, secrets.CRON_SECRET, secrets.NEW_SECRET, secrets.BREVO_API_KEY].filter((x) => x && x.length > 8)) expect(all.includes(s!)).toBe(false);
  for (const jwt of all.match(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) || []) {
    expect(JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString()).role).toBe("anon");
  }
  if (run.targetRef === NEW_REF) expect(all).toMatch(/sb_publishable_/);
  for (const c of chunks) expect((await site(`${c.url}.map`)).status, `${c.url}.map`).toBe(404);
  const hist = execFileSync("git", ["log", "--all", "-p", "-S", "sb_secret_", "--format=%h"], { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 26 });
  expect(hist.split("\n").filter((l) => /^\+.*sb_secret_[A-Za-z0-9]{10,}/.test(l))).toEqual([]);
});

spec({ id: "E17", title: "sensitive files are not served", tier: "gate", env: ["P", "prod"], data: "read" }, async (_args, info) => {
  for (const p of ["/.env", "/.env.local", "/.env.example", "/.env.migration.local", "/.git/config", "/package.json", "/vercel.json", "/supabase/config.toml", "/scripts/migration/lib.mjs", "/e2e/.auth/admin.json", "/api/_lib/spamCheck.ts"]) {
    const r = await site(p);
    const t = await r.text();
    // A 404 page or the SPA shell are both fine; the file's contents must never come back.
    expect(r.status === 404 || /<!doctype html/i.test(t), `${p} → ${r.status}`).toBe(true);
    expect(t).not.toMatch(/VITE_SUPABASE|\[core\]|project_id =|"dependencies"|SUPABASE_PAT/);
  }
  record(info, "manual (AGENT-BR)", "deployment Source tab lists no .env* files");
});

spec({ id: "E18", title: "security headers baseline", tier: "gate", env: ["P", "prod"], data: "read" }, async ({ run }, info) => {
  const keys = ["strict-transport-security", "x-content-type-options", "x-frame-options", "content-security-policy", "referrer-policy", "permissions-policy", "x-robots-tag", "cache-control"];
  const got: Record<string, Record<string, string | null>> = {};
  for (const p of ["/", "/admin", "/login", "/api/keep-db-alive"]) {
    const r = await site(p);
    got[p] = Object.fromEntries(keys.map((k) => [k, r.headers.get(k)]));
    const csp = r.headers.get("content-security-policy");
    if (csp && csp.includes("supabase.co")) expect(csp).toContain(`${run.targetRef}.supabase.co`);
  }
  record(info, "headers", got);
  const bl = process.env.BASELINE_DIR && path.join(process.env.BASELINE_DIR, "http.json");
  if (bl && fs.existsSync(bl)) {
    const base = JSON.parse(fs.readFileSync(bl, "utf8")) as { entries: { path: string; headers: Record<string, string | null> }[] };
    for (const p of Object.keys(got)) {
      const b = base.entries.find((e) => e.path === p);
      if (!b) continue;
      for (const k of keys.filter((k) => k !== "x-robots-tag" && k !== "cache-control")) expect(got[p][k], `${p} ${k}`).toBe(b.headers[k] ?? null);
    }
  }
});

spec({ id: "E21", title: "build installs with npm; resolved versions = package-lock", tier: "gate", env: ["P", "prod"], data: "read" }, async (_args, info) => {
  const host = new URL(BASE_URL).host;
  const dep = (await vercel(`/v13/deployments/${host}`)) as { id: string };
  const events = (await vercel(`/v3/deployments/${dep.id}/events?builds=1&limit=-1`)) as { text?: string; payload?: { text?: string } }[];
  const lines = events.map((e) => e.text || e.payload?.text || "").filter(Boolean);
  const install = lines.filter((l) => /(npm|bun|yarn|pnpm) (i|install|ci)\b|Installing dependencies|Detected .*lock/i.test(l));
  record(info, "install lines", install.slice(0, 10));
  expect(lines.join("\n")).not.toMatch(/bun install|bun\.lockb/);
  expect(install.join("\n")).toMatch(/npm|package-lock/);
  const lock = JSON.parse(fs.readFileSync(path.join(REPO, "package-lock.json"), "utf8"));
  const want = lock.packages["node_modules/@supabase/supabase-js"].version;
  const chunks = (await bundleChunks()).map((c) => c.text).join("\n");
  const inBundle = chunks.match(/supabase-js\/(\d+\.\d+\.\d+)/)?.[1];
  record(info, "supabase-js", { lock: want, bundle: inBundle ?? "not embedded" });
  if (inBundle) expect(inBundle).toBe(want);
});
