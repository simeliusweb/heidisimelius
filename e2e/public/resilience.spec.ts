// A19, A20, A25, D13: behaviour when the backend is slow, broken or goes away.
import { spec, expect, record, test } from "../support/fixtures";
import { ROUTES } from "../support/env";
import { breakBackend, headInfo, jsonLd, eventsOf, gotoSettled, type BackendFailure } from "../support/site";
import { pageMetadata } from "../../src/config/metadata";

const META: Record<string, { title: string }> = {
  "/": pageMetadata.home,
  "/bio": pageMetadata.bio,
  "/keikat": pageMetadata.keikat,
  "/galleria": pageMetadata.galleria,
  "/bilebandi-heidi-and-the-hot-stuff": pageMetadata.bilebandi,
  "/laulunopetus": pageMetadata.laulunopetus,
};

const MODES: BackendFailure[] = ["abort", "503html", "401", "empty"];

spec({ id: "A19", title: "backend down 4 ways: every route degrades within 15 s", tier: "known", env: ["L"], data: "read", extraTags: ["@FX9", "@FX10"] }, async ({ page }, info) => {
  test.setTimeout(600_000);
  const seen: Record<string, string> = {};
  for (const mode of MODES) {
    await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
    await breakBackend(page, mode);
    for (const route of ROUTES) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(15_000);
      const text = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " ").trim());
      seen[`${mode} ${route}`] = text.slice(0, 160);
      expect(text.length, `${mode} ${route}: blank page`).toBeGreaterThan(40);
      await expect(page.getByRole("button", { name: "Toggle menu" }), `${mode} ${route}: header`).toBeVisible();
      if (route !== "/bilebandi-heidi-and-the-hot-stuff") await expect(page.locator("#contact-section"), `${mode} ${route}: footer`).toHaveCount(1);
      // No hero spinner left spinning (the header's font spinner is gone by now too).
      await expect(page.locator(".animate-branded-dot-1:visible"), `${mode} ${route}: spinner forever`).toHaveCount(0);
      await expect(page.locator(".animate-pulse:visible"), `${mode} ${route}: skeleton forever`).toHaveCount(0);
      expect(await page.title(), `${mode} ${route}: title`).toBe(META[route].title);
    }
  }
  record(info, "degraded texts", seen);
});

for (const mode of ["delay", "abort"] as const) {
  spec({ id: `A20-${mode}`, title: `SEO head doesn't depend on the DB (REST ${mode})`, tier: "known", env: ["L"], data: "read", extraTags: ["@FX10"] }, async ({ page }) => {
    test.setTimeout(180_000);
    await page.route(/\.supabase\.co\/rest\/v1\//, async (route) => {
      if (mode === "abort") return route.abort("failed");
      await new Promise((r) => setTimeout(r, 8000));
      return route.continue().catch(() => {});
    });
    for (const route of ["/galleria", "/bio", "/laulunopetus"]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);
      const early = await headInfo(page);
      const canonical = `https://www.heidisimelius.fi${route}`;
      expect(early.title, `${route} title at 0.5 s`).toBe(META[route].title);
      expect(early.canonical, `${route} canonical at 0.5 s`).toEqual([canonical]);
      expect(early.ogUrl).toEqual([canonical]);
      if (route === "/bio") {
        const types = (await jsonLd(page)).map((j) => (j as { "@type"?: string })?.["@type"]);
        expect(types, "/bio Person JSON-LD at 0.5 s").toContain("Person");
      }
      await page.waitForTimeout(mode === "delay" ? 9000 : 2000);
      const late = await headInfo(page);
      expect(late.title).toBe(META[route].title);
      expect(late.canonical).toEqual([canonical]);
    }
  });
}

spec({ id: "A25", title: "an open tab keeps its content when the backend goes away", tier: "known", env: ["L"], data: "read", extraTags: ["@FX9"] }, async ({ page }) => {
  for (const route of ["/", "/keikat", "/galleria", "/bio"]) {
    await gotoSettled(page, route);
    const before = await page.evaluate(() => document.body.innerText.length);
    await page.route(/\.supabase\.co\/rest\/v1\//, (r) => r.abort("failed"));
    // react-query refetches stale queries on focus/visibility.
    await page.evaluate(() => {
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("focus"));
    });
    await page.waitForTimeout(6000);
    await expect(page.getByText(/Virhe/).filter({ visible: true }), `${route}: error replaced content`).toHaveCount(0);
    const after = await page.evaluate(() => document.body.innerText.length);
    expect(after, `${route}: content kept`).toBeGreaterThan(before * 0.9);
    await page.unrouteAll({ behavior: "ignoreErrors" });
  }
});

spec({ id: "D13", title: "degraded backend: error state, head intact, no half-built JSON-LD", tier: "known", env: ["L"], data: "read", extraTags: ["@FX9", "@FX10"] }, async ({ page }) => {
  await breakBackend(page, "abort");
  for (const route of ["/keikat", "/"]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(8000);
    const h = await headInfo(page);
    expect(h.title).toBe(META[route].title);
    expect(h.canonical).toEqual([`https://www.heidisimelius.fi${route}`]);
    const events = eventsOf(await jsonLd(page));
    expect(events.length, `${route}: no events from a dead backend`).toBe(0);
  }
});
