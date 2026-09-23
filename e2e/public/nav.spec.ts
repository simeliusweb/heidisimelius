// A10, A11, A12, A21, A30, A35: navigation, menu, footer, anchors and the head across SPA navigation.
import { spec, expect, test } from "../support/fixtures";
import { gotoSettled, headInfo, settle } from "../support/site";

const NAV = [
  ["Keikat", "/keikat"],
  ["Bio", "/bio"],
  ["Galleria", "/galleria"],
  ["Laulunopetus", "/laulunopetus"],
  ["Heidi & The Hot Stuff", "/bilebandi-heidi-and-the-hot-stuff"],
] as const;

async function openMenu(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Toggle menu" }).click();
  await expect(page.locator("nav").first().getByRole("link").first()).toBeVisible();
}

spec({ id: "A10", title: "header navigation: links, active state, contact anchor, logo", tier: "regression", env: ["L", "prod"], data: "read" }, async ({ page }) => {
  await gotoSettled(page, "/");
  await openMenu(page);
  const nav = page.locator("nav").first();
  // 5 page links + "Ota yhteyttä"; the current page renders as plain text.
  for (const [label, href] of NAV) {
    const link = nav.getByRole("link", { name: label, exact: true });
    await expect(link).toHaveAttribute("href", href);
  }
  await expect(nav.getByRole("link", { name: "Ota yhteyttä" })).toHaveAttribute("href", /#contact-section$/);
  await nav.getByRole("link", { name: "Keikat", exact: true }).click();
  await page.waitForURL(/\/keikat$/);
  await openMenu(page);
  await expect(page.locator("nav").first().getByRole("link", { name: "Keikat", exact: true })).toHaveCount(0);
  await expect(page.locator("nav").first().getByText("Keikat", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Ota yhteyttä" }).click();
  await expect(page.locator("#contact-section")).toBeInViewport({ ratio: 0.1 });
  await page.getByRole("link", { name: "Heidi Simelius" }).first().click().catch(async () => page.locator('a[href="/"]').first().click());
  await page.waitForURL((u) => new URL(u).pathname === "/");
});

spec({ id: "A11", title: "mobile menu open/close, navigation closes it, scroll unlocks", tier: "regression", env: ["L"], data: "read", mobile: true }, async ({ page }) => {
  await gotoSettled(page, "/");
  const panelLinks = page.locator("nav").first().getByRole("link", { name: "Bio", exact: true });
  await openMenu(page);
  await expect(panelLinks).toBeVisible();
  await page.getByRole("button", { name: "Toggle menu" }).click();
  await expect(panelLinks).toBeHidden();
  await openMenu(page);
  await panelLinks.click();
  await page.waitForURL(/\/bio$/);
  await expect(page.locator("nav").first().getByRole("link", { name: "Keikat", exact: true })).toBeHidden();
  const scrolled = await page.evaluate(async () => { window.scrollTo(0, 800); await new Promise((r) => setTimeout(r, 200)); return window.scrollY; });
  expect(scrolled).toBeGreaterThan(0);
});

spec({ id: "A12", title: "footer nav and social links; hidden on bilebandi and admin", tier: "regression", env: ["L"], data: "read" }, async ({ page }) => {
  await gotoSettled(page, "/");
  const footer = page.locator("#contact-section");
  await expect(footer).toHaveCount(1);
  for (const label of ["KEIKAT", "BIO", "GALLERIA", "LAULUNOPETUS"]) await expect(footer.getByRole("link", { name: label, exact: true })).toHaveCount(1);
  for (const s of ["Instagram", "TikTok", "Facebook", "Apple Music", "Spotify"]) await expect(footer.getByRole("link", { name: s })).toHaveAttribute("target", "_blank");
  // Bilebandi has its own booking section (also #contact-section) and footer; the site footer's form must be gone.
  await gotoSettled(page, "/bilebandi-heidi-and-the-hot-stuff");
  await expect(page.getByPlaceholder("Kirjoita aihe...")).toHaveCount(0);
  await page.goto("/admin");
  await page.waitForURL(/\/(login|admin)$/);
  if (page.url().endsWith("/admin")) await expect(page.getByPlaceholder("Kirjoita aihe...")).toHaveCount(0);
});

async function homeAnchors(page: import("@playwright/test").Page) {
  return page.locator('a[href^="/keikat#"]').evaluateAll((as) => as.map((a) => decodeURIComponent(a.getAttribute("href")!.split("#")[1])));
}

spec({ id: "A21", title: "every home fragment exists once on /keikat and scrolls into view", tier: "known", env: ["L"], data: "read", extraTags: ["@FX6"] }, async ({ page }) => {
  await gotoSettled(page, "/");
  const ids = await homeAnchors(page);
  await gotoSettled(page, "/keikat");
  const allIds = await page.evaluate(() => [...document.querySelectorAll("[id]")].map((e) => e.id).filter(Boolean));
  const dupes = allIds.filter((id, i) => allIds.indexOf(id) !== i);
  expect(dupes, "duplicate ids on /keikat").toEqual([]);
  for (const id of ids) expect(allIds, `anchor ${id}`).toContain(id);
  // Home → Keikat → Back → click the next card
  await gotoSettled(page, "/");
  if (ids.length >= 2) {
    await page.locator('a[href^="/keikat#"]').nth(0).click();
    await page.waitForURL(/\/keikat/);
    await page.goBack();
    await settle(page);
    await page.locator('a[href^="/keikat#"]').nth(1).click();
    await expect(page.locator(`[id="${ids[1]}"]`)).toBeInViewport({ ratio: 0.1, timeout: 15_000 });
  }
});

spec({ id: "A35", title: "hard-loaded /keikat#id scrolls once the data arrives", tier: "known", env: ["L"], data: "read", extraTags: ["@FX6"] }, async ({ page }) => {
  await gotoSettled(page, "/");
  const ids = await homeAnchors(page);
  test.skip(ids.length === 0, "no upcoming gig cards on home");
  const last = ids[ids.length - 1];
  // Slow the gigs query so the anchor appears late.
  await page.route(/\/rest\/v1\/gigs/, async (route) => { await new Promise((r) => setTimeout(r, 1500)); await route.continue(); });
  await page.goto(`/keikat#${encodeURIComponent(last)}`);
  await expect(page.locator(`[id="${last}"]`)).toBeInViewport({ ratio: 0.1, timeout: 20_000 });
});

spec({ id: "A30", title: "head after SPA navigation both ways", tier: "gate", env: ["L", "prod"], data: "read" }, async ({ page }) => {
  await gotoSettled(page, "/");
  const order = ["/keikat", "/bio", "/galleria", "/laulunopetus", "/", "/keikat"];
  for (const target of order) {
    if (target === "/") await page.locator('a[href="/"]').first().click();
    else {
      await openMenu(page);
      const label = NAV.find(([, h]) => h === target)![0];
      await page.locator("nav").first().getByRole("link", { name: label, exact: true }).click();
    }
    await page.waitForURL((u) => new URL(u).pathname === target);
    await settle(page);
    const h = await headInfo(page);
    expect(h.canonical, `${target} canonical`).toEqual([`https://www.heidisimelius.fi${target === "/" ? "/" : target}`]);
    expect(h.ogUrl).toEqual(h.canonical);
    const types = await page.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => {
      const j = JSON.parse(s.textContent || "null");
      return Array.isArray(j) ? (j[0]?.["@type"] ?? "[]") : j?.["@type"];
    }));
    const want = target === "/keikat" ? [/Event/] : target === "/bio" ? [/^Person$/] : target === "/laulunopetus" ? [/^Service$/] : [];
    expect(types.length, `${target} JSON-LD blocks ${JSON.stringify(types)}`).toBeLessThanOrEqual(1);
    if (want.length && types.length) expect(String(types[0])).toMatch(want[0]);
    if (!want.length) expect(types, `${target} has no JSON-LD`).toEqual([]);
    expect(h.lightwidgetScripts, `${target} lightwidget scripts`).toBeLessThanOrEqual(1);
  }
});
