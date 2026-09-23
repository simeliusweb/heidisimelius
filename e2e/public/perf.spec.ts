// Performance: A33, F1, F4, F5, F6, F7, F8. Comparisons against BL1 use BASELINE_DIR
// ($STATE/baselines/<label>, written by scripts/migration/capture.mjs); without it the values are recorded.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { chromium } from "@playwright/test";
import { spec, expect, record, test } from "../support/fixtures";
import { BASE_URL, NEW_REF, OLD_REF, ROUTES, STATE, T0, previewHeaders } from "../support/env";
import { gotoSettled } from "../support/site";

const baseline = (file: string) => {
  const d = process.env.BASELINE_DIR;
  const f = d && path.join(d, file);
  return f && fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null;
};
const site = (p: string) => {
  const url = p.startsWith("http") ? p : `${BASE_URL}${p}`;
  return fetch(url, { headers: previewHeaders(url) });
};

spec({ id: "A33", title: "storage egress per cold visit (record)", tier: "record", env: ["L"], data: "read", mobile: true }, async ({ page }, info) => {
  const out: Record<string, number> = {};
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  const bytes = new Map<string, number>();
  cdp.on("Network.loadingFinished", (e) => bytes.set(e.requestId, e.encodedDataLength));
  const urls = new Map<string, string>();
  cdp.on("Network.requestWillBeSent", (e) => urls.set(e.requestId, e.request.url));
  for (const r of ROUTES) {
    bytes.clear();
    await gotoSettled(page, r);
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((res) => setTimeout(res, 80)); } });
    await page.waitForTimeout(1500);
    out[r] = [...bytes].filter(([id]) => /\.supabase\.co\/storage\//.test(urls.get(id) || "")).reduce((a, [, b]) => a + b, 0);
  }
  record(info, `storage bytes per route (${test.info().project.name})`, out);
});

async function supabaseTimings(page: import("@playwright/test").Page, route: string) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  const t: number[] = [];
  cdp.on("Network.responseReceived", (e) => {
    if (e.response.url.includes(".supabase.co") && e.response.timing) t.push(e.response.timing.receiveHeadersEnd - e.response.timing.sendStart);
  });
  await gotoSettled(page, route);
  await cdp.detach();
  t.sort((a, b) => a - b);
  return { n: t.length, median: t[Math.floor(t.length / 2)] ?? 0, p90: t[Math.floor(t.length * 0.9)] ?? 0 };
}

spec({ id: "F1", title: "Supabase latency (CDP) vs BL1 + 100 ms", tier: "regression", env: ["L"], data: "read" }, async ({ page }, info) => {
  const got: Record<string, { n: number; median: number; p90: number }> = {};
  for (const r of ["/", "/galleria"]) got[r] = await supabaseTimings(page, r);
  record(info, "timings", got);
  const base = baseline("rendered.json") as { routes?: Record<string, { supabaseTiming?: { median: number } }> } | null;
  if (base?.routes) for (const r of Object.keys(got)) {
    const b = base.routes[r]?.supabaseTiming?.median;
    if (b !== undefined) expect(got[r].median, r).toBeLessThanOrEqual(b + 100);
  }
});

spec({ id: "F4", title: "bundle budget: main chunk brotli ≤ BL1 × 1.05; one Supabase host", tier: "gate", env: ["P", "prod"], data: "read" }, async ({ run }, info) => {
  const html = await (await site("/")).text();
  const main = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)![0];
  const js = Buffer.from(await (await site(main)).arrayBuffer());
  const br = zlib.brotliCompressSync(js, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
  const hosts = new Set(js.toString().match(/[a-z0-9]{20}\.supabase\.co/g) || []);
  record(info, "bundle", { main, raw: js.length, brotli: br, hosts: [...hosts] });
  expect(hosts.size).toBe(1);
  expect([...hosts][0]).toBe(`${run.targetRef}.supabase.co`);
  if (run.targetRef === NEW_REF) expect(js.toString()).toMatch(/sb_publishable_/);
  const b = baseline("http.json") as { bundle?: { brotli?: number } } | null;
  const limit = Number(process.env.BL1_BUNDLE_BROTLI || b?.bundle?.brotli || 0);
  if (limit) expect(br).toBeLessThanOrEqual(limit * 1.05);
});

spec({ id: "F5", title: "LCP element and time (Slow 4G, 4× CPU) vs BL1", tier: "regression", env: ["L"], data: "read" }, async ({ page }, info) => {
  test.setTimeout(300_000);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const out: Record<string, { el: string; ms: number }> = {};
  for (const r of ROUTES) {
    await page.goto(r, { waitUntil: "load", timeout: 60_000 });
    await page.waitForTimeout(3000);
    out[r] = await page.evaluate(
      () =>
        new Promise<{ el: string; ms: number }>((res) => {
          new PerformanceObserver((l) => {
            const e = l.getEntries().at(-1) as PerformanceEntry & { element?: Element; url?: string };
            res({ el: e?.element ? `${e.element.tagName.toLowerCase()}${e.url ? " " + e.url.split("/").slice(-1)[0] : ""}` : "none", ms: Math.round(e?.startTime || 0) });
          }).observe({ type: "largest-contentful-paint", buffered: true });
          setTimeout(() => res({ el: "timeout", ms: -1 }), 3000);
        }),
    );
  }
  record(info, "lcp", out);
  const base = baseline("rendered.json") as { routes?: Record<string, { lcp?: { el: string; ms: number } }> } | null;
  if (base?.routes) for (const r of ROUTES) {
    const b = base.routes[r]?.lcp;
    if (!b || b.ms <= 0) continue;
    expect(out[r].el.split(" ")[0], `${r} LCP element`).toBe(b.el.split(" ")[0]);
    expect(out[r].ms, `${r} LCP`).toBeLessThanOrEqual(b.ms * 1.3);
  }
});

spec({ id: "F6", title: "CLS with late data ≤ 0.1", tier: "regression", env: ["L"], data: "read" }, async ({ page }, info) => {
  const out: Record<string, number> = {};
  for (const delay of [0, 1500]) {
    await page.unrouteAll({ behavior: "ignoreErrors" });
    if (delay) await page.route(/\.supabase\.co\/rest\/v1\//, async (r) => { await new Promise((x) => setTimeout(x, delay)); await r.continue(); });
    for (const r of ["/", "/keikat", "/galleria", "/bio"]) {
      await page.addInitScript(() => {
        (window as unknown as { __cls: number }).__cls = 0;
        new PerformanceObserver((l) => { for (const e of l.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value; }).observe({ type: "layout-shift", buffered: true });
      });
      await gotoSettled(page, r);
      await page.waitForTimeout(delay + 1500);
      out[`${r} +${delay}ms`] = await page.evaluate(() => Math.round((window as unknown as { __cls: number }).__cls * 1000) / 1000);
    }
  }
  record(info, "cls", out);
  for (const [k, v] of Object.entries(out)) expect(v, k).toBeLessThanOrEqual(0.1);
});

spec({ id: "F7-prime", title: "prime a returning-visitor profile before GL", tier: "record", env: ["prod"], data: "read", extraTags: ["@pre-gl"] }, async ({ run }, info) => {
  test.skip(run.targetRef === NEW_REF, "already after GL");
  const dir = path.join(STATE, "baselines/F7-profile");
  const ctx = await chromium.launchPersistentContext(dir, { timezoneId: "Europe/Helsinki" });
  const p = await ctx.newPage();
  for (const r of ROUTES) await p.goto(`https://www.heidisimelius.fi${r}`, { waitUntil: "load" });
  await ctx.close();
  record(info, "profile", dir);
});

spec({ id: "F7", title: "returning visitor gets the new bundle and only the new ref", tier: "gate", env: ["prod"], data: "read", post: true }, async () => {
  const dir = path.join(STATE, "baselines/F7-profile");
  test.skip(!fs.existsSync(dir), "run F7-prime before GL");
  const ctx = await chromium.launchPersistentContext(dir, { timezoneId: "Europe/Helsinki" });
  const p = await ctx.newPage();
  const urls: string[] = [];
  p.on("request", (r) => urls.push(r.url()));
  const resp = await p.goto("https://www.heidisimelius.fi/keikat", { waitUntil: "load" });
  await p.waitForTimeout(4000);
  expect(resp!.headers()["cache-control"]).toBe("public, max-age=0, must-revalidate");
  expect(urls.filter((u) => u.includes(OLD_REF))).toEqual([]);
  expect(urls.some((u) => u.includes(NEW_REF))).toBe(true);
  await ctx.close();
});

spec({ id: "F8", title: "no stale Supabase host hints (preconnect/preload/CSP)", tier: "gate", env: ["P", "prod"], data: "read" }, async ({ run }) => {
  for (const r of [...ROUTES, "/admin"]) {
    const res = await site(r);
    const html = await res.text();
    const hints = [...html.matchAll(/<link[^>]*rel="(?:preconnect|dns-prefetch|preload|prefetch)"[^>]*href="([^"]+)"/g)].map((m) => m[1]).filter((h) => h.includes("supabase.co"));
    for (const h of hints) expect(h, r).toContain(`${run.targetRef}.supabase.co`);
    const csp = res.headers.get("content-security-policy") || "";
    for (const h of csp.match(/[a-z0-9]{20}\.supabase\.co/g) || []) expect(h).toBe(`${run.targetRef}.supabase.co`);
  }
  void T0;
});
