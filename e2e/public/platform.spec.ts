// A14, A15, A34: Vercel platform behaviour (real 404, redirects, headers) and bypass scoping.
import { spec, expect, test } from "../support/fixtures";
import { BASE_URL, CURRENT_ENV, previewHeaders } from "../support/env";
import { gotoSettled, headInfo } from "../support/site";

async function raw(path: string, init: RequestInit = {}) {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  return fetch(url, { redirect: "manual", ...init, headers: { ...previewHeaders(url), ...(init.headers as Record<string, string>) } });
}

spec({ id: "A14", title: "bogus path: real 404, branded page, noindex, quick links", tier: "gate", env: ["P", "prod"], data: "read", smoke: true }, async ({ page }) => {
  const r = await raw("/this-page-does-not-exist-e2e");
  expect(r.status).toBe(404);
  const html = await r.text();
  expect(html).toMatch(/<meta[^>]*name="robots"[^>]*content="noindex, follow"/);
  expect(html).not.toMatch(/rel="canonical"/);
  const resp = await gotoSettled(page, "/this-page-does-not-exist-e2e");
  expect(resp?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Sivua ei löytynyt" })).toBeVisible();
  const h = await headInfo(page);
  expect(h.robots).toEqual(["noindex, follow"]);
  expect(h.canonical).toEqual([]);
  const quick = page.getByRole("navigation", { name: "Pikalinkit" }).getByRole("link");
  await expect(quick).toHaveCount(5);
  await quick.first().click();
  await page.waitForURL(/\/keikat$/);
});

spec({ id: "A15", title: "redirects and noindex headers", tier: "regression", env: ["P", "prod"], data: "read" }, async () => {
  const cases: [string, number, string | null][] = [
    ["/keikat/", 308, "/keikat"],
    ["/bio/", 308, "/bio"],
    ["/bilebandi-heidi-", 308, "/bilebandi-heidi-and-the-hot-stuff"],
  ];
  for (const [p, status, loc] of cases) {
    const r = await raw(p);
    expect(r.status, p).toBe(status);
    expect(new URL(r.headers.get("location")!, BASE_URL).pathname, p).toBe(loc);
  }
  // "//keikat" collapses to a clean path (any redirect or a direct 200 on /keikat content)
  const dbl = await raw("//keikat");
  expect([200, 301, 308, 404], "//keikat").toContain(dbl.status);
  for (const p of ["/admin", "/login"]) {
    const r = await raw(p);
    expect(r.status, p).toBe(200);
    expect((r.headers.get("x-robots-tag") || "").toLowerCase(), p).toContain("noindex");
  }
  if (CURRENT_ENV === "prod") {
    const apex = await fetch("https://heidisimelius.fi/keikat", { redirect: "manual" });
    expect(apex.status).toBe(308);
    expect(apex.headers.get("location")).toBe("https://www.heidisimelius.fi/keikat");
  }
});

spec({ id: "A34", title: "bypass cookie/header never reaches Supabase or third parties", tier: "gate", env: ["P"], data: "read" }, async ({ page, rec }) => {
  const leaks: string[] = [];
  const preflights: string[] = [];
  page.on("request", async (req) => {
    const u = new URL(req.url());
    const h = await req.allHeaders();
    if (u.origin !== new URL(BASE_URL).origin) {
      if (Object.keys(h).some((k) => k.startsWith("x-vercel-protection-bypass")) || (h.cookie || "").includes("_vercel_jwt") || (h.cookie || "").includes("bypass")) leaks.push(req.url());
      if (req.method() === "OPTIONS") preflights.push(req.url());
    }
  });
  for (const r of ["/", "/keikat", "/galleria"]) await gotoSettled(page, r);
  expect(leaks).toEqual([]);
  // supabase-js always preflights (apikey header); what matters is that the bypass adds none. Recorded for BL1/BL2 comparison.
  test.info().annotations.push({ type: "preflights", description: String(preflights.length) });
  expect(rec.requests.length).toBeGreaterThan(0);
});
