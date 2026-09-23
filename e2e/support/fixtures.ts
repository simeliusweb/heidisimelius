// Shared fixtures for every spec (Appendix C.0):
//  - spec(): builds the tagged title and skips outside the test's environments / guards
//  - network recorder, console collector with a third-party allowlist
//  - write-firewall on *.supabase.co (non-GET only for @cms-write), R4 hard block on the old ref
//  - mail guard on /api/send-email (R5, C22)
//  - T0 clock (Date only; timers keep running) for everything that isn't a CMS test
import { test as base, expect, type Page, type TestInfo } from "@playwright/test";
import fs from "node:fs";
import { CURRENT_ENV, NEW_REF, OLD_REF, REPO, T0, type EnvName, runInfo, RUN_FILE } from "./env";
import { mailGuardVerdict } from "./mail";
import { ledgerAdd } from "./rest";

export { expect };

export type Tier = "gate" | "regression" | "known" | "record";
export type Env = "L" | "P" | "prod" | "direct";
export type DataClass = "read" | "test-rows" | "mutates-real";

export interface Meta {
  id: string;
  title: string;
  tier: Tier;
  env: Env[];
  data: DataClass;
  cmsWrite?: boolean;
  prodSafe?: boolean;
  smoke?: boolean;
  mobile?: boolean;
  /** Prod-only POST check (runs after GL only: prod must already be on the new ref). */
  post?: boolean;
  /** Real clock instead of T0 (live-clock runs, CMS). */
  liveClock?: boolean;
  extraTags?: string[];
}

export function tagTitle(m: Meta): string {
  const tags = [
    `@${m.tier}`,
    ...m.env.map((e) => `@${e}`),
    `@${m.data}`,
    m.cmsWrite ? "@cms-write" : "",
    m.prodSafe ? "@prod-safe" : "",
    m.smoke ? "@smoke" : "",
    m.mobile ? "@mobile" : "",
    m.post ? "@post" : "",
    ...(m.extraTags || []),
  ].filter(Boolean);
  return `${m.id} ${m.title} ${tags.join(" ")}`;
}

export interface NetEntry { url: string; method: string; type: string; status?: number }

export interface Recorder {
  requests: NetEntry[];
  consoleErrors: string[];
  firewallBlocks: string[];
  refCounts(): { old: number; new: number; hosts: string[] };
}

const THIRD_PARTY = /lightwidget|youtube|ytimg|googlevideo|doubleclick|google\.com|gstatic|spotify|scdn\.co|instagram|cdninstagram|facebook|fbcdn|vercel-insights|vercel-scripts|_vercel\/insights|tampereenlaulukoulu|asioi\.fi|apple\.com/i;
const CONSOLE_ALLOW = [
  /404 Error: User attempted to access non-existent route/, // NotFound.tsx logs on purpose
  /Download the React DevTools/,
];

/**
 * Pre-existing site bugs seen on BL0 that aren't migration-caused and aren't on the fix list.
 * They are annotated on the test (so the READY report lists them) instead of failing it.
 */
export const KNOWN_PREEXISTING: { re: RegExp; note: string }[] = [
  { re: /\/undefined(\?|$)/, note: "PRE-1: /keikat hero renders url(undefined) before page_images loads → GET /undefined 404" },
];

export async function pinClock(page: Page, at: string = T0) {
  await page.clock.install({ time: new Date(at) });
  await page.clock.resume();
}

function isAuthCall(url: string) {
  return /\/auth\/v1\/(token|logout|user)/.test(url);
}

type Fixtures = { meta: Meta; rec: Recorder; run: ReturnType<typeof runInfo> };

export const test = base.extend<Fixtures>({
  meta: [undefined as unknown as Meta, { option: true }],
  // Playwright requires the destructuring pattern; `use` is Playwright's, not a React hook.
  // eslint-disable-next-line no-empty-pattern
  run: async ({}, use) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(fs.existsSync(RUN_FILE) ? runInfo() : ({} as ReturnType<typeof runInfo>));
  },
  rec: [
    async ({ page, meta }, use, testInfo) => {
      const rec: Recorder = {
        requests: [],
        consoleErrors: [],
        firewallBlocks: [],
        refCounts() {
          const hosts = [...new Set(this.requests.map((r) => new URL(r.url).host))];
          return {
            old: this.requests.filter((r) => r.url.includes(OLD_REF)).length,
            new: this.requests.filter((r) => r.url.includes(NEW_REF)).length,
            hosts,
          };
        },
      };
      page.on("request", (r) => rec.requests.push({ url: r.url(), method: r.method(), type: r.resourceType() }));
      page.on("response", (r) => {
        const e = rec.requests.findLast((x) => x.url === r.url() && x.status === undefined);
        if (e) e.status = r.status();
      });
      page.on("console", (m) => {
        if (m.type() !== "error") return;
        const text = m.text();
        const loc = m.location()?.url || "";
        if (CONSOLE_ALLOW.some((re) => re.test(text)) || THIRD_PARTY.test(loc) || THIRD_PARTY.test(text)) return;
        const known = KNOWN_PREEXISTING.find((k) => k.re.test(loc));
        if (known) {
          if (!testInfo.annotations.some((a) => a.description === known.note)) testInfo.annotations.push({ type: "known-preexisting", description: known.note });
          return;
        }
        // The document itself of an intentional 404 visit
        if (/status of 404/.test(text) && /this-page-does-not-exist-e2e|\/wp-admin/.test(loc)) return;
        rec.consoleErrors.push(`${text.slice(0, 200)} @ ${loc.slice(0, 120)}`);
      });
      page.on("pageerror", (err) => {
        if (THIRD_PARTY.test(err.stack || "")) return;
        rec.consoleErrors.push(`pageerror: ${err.message.slice(0, 300)}`);
      });

      const cmsWrite = Boolean(meta?.cmsWrite);
      // Every storage upload a CMS test makes goes into the ledger (exact keys for the B15 cleanup).
      if (cmsWrite) {
        page.on("request", (req) => {
          const m = req.url().match(/\.supabase\.co\/storage\/v1\/object\/(?!public\/|list\/|sign\/|move|copy)([^?]+)/);
          if (m && (req.method() === "POST" || req.method() === "PUT")) ledgerAdd("objects", decodeURIComponent(m[1]));
        });
      }
      // R4 + write firewall
      await page.route(/\.supabase\.co\//, async (route) => {
        const req = route.request();
        const m = req.method();
        const url = req.url();
        if (m === "GET" || m === "HEAD" || m === "OPTIONS") return route.continue();
        if (url.includes(OLD_REF) && !isAuthCall(url)) {
          rec.firewallBlocks.push(`R4 ${m} ${url}`);
          return route.abort("blockedbyclient");
        }
        if (!cmsWrite && !isAuthCall(url)) {
          rec.firewallBlocks.push(`firewall ${m} ${url}`);
          return route.abort("blockedbyclient");
        }
        return route.continue();
      });
      // R5 mail guard for anything the page itself posts
      await page.route("**/api/send-email", async (route) => {
        const req = route.request();
        if (req.method() !== "POST") return route.continue();
        let body: unknown = null;
        try { body = req.postDataJSON(); } catch { body = null; }
        const v = mailGuardVerdict(body);
        if (!v.allowed) {
          rec.firewallBlocks.push(`mail-guard ${v.reason}`);
          return route.abort("blockedbyclient");
        }
        return route.continue();
      });

      // T0 clock: time starts at T0 and keeps running (a frozen Date stalls GSAP, which times itself with
      // Date.now). Counts can't change within a run: no gig starts within hours of T0.
      if (!meta?.liveClock && !cmsWrite) await pinClock(page);

      await use(rec);

      const mailBlocks = rec.firewallBlocks.filter((b) => b.startsWith("mail-guard") || b.startsWith("R4"));
      if (mailBlocks.length) {
        testInfo.annotations.push({ type: "guard", description: mailBlocks.join("\n") });
        throw new Error(`Guard violation: ${mailBlocks.join("; ")}`);
      }
    },
    { auto: true },
  ],
});

/** Declare a test with its Appendix C metadata; skips cleanly outside its environments and guards. */
export function spec(m: Meta, fn: (args: { page: Page; rec: Recorder; run: ReturnType<typeof runInfo>; request: import("@playwright/test").APIRequestContext }, info: TestInfo) => Promise<void>) {
  test.describe(() => {
    test.use({ meta: m });
    if (m.cmsWrite) test.use({ storageState: `${REPO}/e2e/.auth/admin.json` });
    test(tagTitle(m), async ({ page, rec, run, request }, info) => {
      // E2E_IGNORE_ENV=1: run read-only L tests against another env to shake out selectors (never with writes).
      const ignoreEnv = process.env.E2E_IGNORE_ENV === "1" && m.data === "read" && !m.cmsWrite;
      const envOk = ignoreEnv || m.env.includes(CURRENT_ENV as Env) || (m.env.includes("direct") && m.env.length === 1);
      test.skip(!envOk, `not for env ${CURRENT_ENV} (runs in ${m.env.join("/")})`);
      if (m.cmsWrite) {
        test.skip(!run.allowCmsWrite, "@cms-write guard: target must be the new ref and prod must not be on it yet");
        if (CURRENT_ENV === "prod") test.skip(!m.prodSafe, "after GL only @prod-safe CMS tests run");
      }
      if (m.data === "mutates-real") test.skip(run.prodRef === NEW_REF, "@mutates-real never runs after GL");
      if (m.post) test.skip(!(CURRENT_ENV === "prod" && run.targetRef === NEW_REF), "POST-GL check: prod must already serve the new ref");
      await fn({ page, rec, run, request }, info);
    });
  });
}

export function record(info: TestInfo, type: string, value: unknown) {
  info.annotations.push({ type, description: typeof value === "string" ? value : JSON.stringify(value) });
}

export const isEnv = (e: EnvName) => CURRENT_ENV === e;
