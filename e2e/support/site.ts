// Page helpers shared by the public / SEO specs.
import type { Page } from "@playwright/test";

/** Navigate and wait until data-driven content has settled (skeletons and spinners gone). */
export async function gotoSettled(page: Page, path: string, { timeout = 30_000 } = {}) {
  const resp = await page.goto(path, { waitUntil: "domcontentloaded" });
  await settle(page, timeout);
  return resp;
}

export async function settle(page: Page, timeout = 30_000) {
  await page.waitForLoadState("load", { timeout }).catch(() => {});
  await page
    .waitForFunction(() => document.querySelectorAll(".animate-pulse").length === 0, undefined, { timeout })
    .catch(() => {});
  // Let react-query settle and Helmet flush.
  await page.waitForTimeout(500);
}

/** Click every "Näytä lisää" until none is left (galleries, past gigs, event groups). */
export async function expandAll(page: Page, max = 60) {
  for (let i = 0; i < max; i++) {
    // Gallery buttons show "Ladataan..." while the next photos load.
    await page.getByRole("button", { name: /Ladataan/ }).first().waitFor({ state: "detached", timeout: 15_000 }).catch(() => {});
    const btn = page.getByRole("button", { name: "Näytä lisää" }).first();
    if (!(await btn.isVisible().catch(() => false))) break;
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    await btn.click();
    await page.waitForTimeout(500);
  }
}

/** The event card (nearest element with an id) that holds a level-2 heading. */
export function cardOf(page: Page, title: string | RegExp) {
  return page.getByRole("heading", { level: 2, name: title, exact: typeof title === "string" }).first().locator("xpath=ancestor::*[@id][1]");
}

/** Scroll every image into view and wait until each has finished loading. */
export async function loadAllImages(page: Page, timeout = 30_000) {
  await page.evaluate(async () => {
    for (const img of [...document.images]) {
      img.scrollIntoView({ block: "center" });
      if (!img.complete) await new Promise((r) => { img.addEventListener("load", r, { once: true }); img.addEventListener("error", r, { once: true }); setTimeout(r, 3000); });
    }
    window.scrollTo(0, 0);
  });
  await page.waitForFunction(() => [...document.images].every((i) => i.complete), undefined, { timeout }).catch(() => {});
}

export async function jsonLd(page: Page): Promise<unknown[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => {
      try { return JSON.parse(s.textContent || "null"); } catch { return { __invalid: s.textContent }; }
    }),
  );
}

export async function headInfo(page: Page) {
  return page.evaluate(() => {
    const attr = (sel: string, a = "content") => [...document.querySelectorAll(sel)].map((e) => e.getAttribute(a));
    return {
      title: document.title,
      canonical: attr('link[rel="canonical"]', "href"),
      description: attr('meta[name="description"]'),
      robots: attr('meta[name="robots"]'),
      ogUrl: attr('meta[property="og:url"]'),
      ogTitle: attr('meta[property="og:title"]'),
      lightwidgetScripts: document.querySelectorAll('script[src*="lightwidget.js"]').length,
      jsonLdCount: document.querySelectorAll('script[type="application/ld+json"]').length,
    };
  });
}

/** Normalised visible text of the page body (whitespace collapsed, refs/keys masked). */
export async function mainText(page: Page): Promise<string> {
  const t = await page.evaluate(() => (document.querySelector("main") || document.body).innerText);
  return normaliseText(t);
}

export function normaliseText(t: string): string {
  return t
    .replace(/[a-z0-9]{20}\.supabase\.co/g, "<REF>.supabase.co")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

export function maskRef(s: string): string {
  return s.replace(/[a-z0-9]{20}\.supabase\.co/g, "<REF>.supabase.co");
}

/** Events in the /keikat JSON-LD (the page emits one array block). */
export function eventsOf(blocks: unknown[]): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const b of blocks) {
    const arr = Array.isArray(b) ? b : [b];
    for (const x of arr) if (x && typeof x === "object" && /Event$/.test(String((x as Record<string, unknown>)["@type"]))) out.push(x as Record<string, unknown>);
  }
  return out;
}

/** Hide the backend: 4 failure modes for A19 / D13. */
export type BackendFailure = "abort" | "503html" | "401" | "empty";
export async function breakBackend(page: Page, mode: BackendFailure) {
  await page.route(/\.supabase\.co\/rest\/v1\//, (route) => {
    if (mode === "abort") return route.abort("failed");
    if (mode === "503html") return route.fulfill({ status: 503, contentType: "text/html", body: "<html><body>Service Unavailable</body></html>" });
    if (mode === "401") return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "Invalid API key" }) });
    return route.fulfill({ status: 200, contentType: "application/json", body: route.request().headers()["accept"]?.includes("vnd.pgrst.object") ? "null" : "[]" });
  });
}

/** Items under a ShadowHeading section: counts `tag` elements in the nearest <section> of each heading. */
export async function countInSections(page: Page, headings: string[], tag: string): Promise<number> {
  return page.evaluate(
    ([hs, t]) => {
      let n = 0;
      for (const h of document.querySelectorAll("h2")) {
        if (!hs.includes((h.textContent || "").trim())) continue;
        const sec = h.closest("section");
        if (!sec) continue;
        n += [...sec.querySelectorAll(t)].filter((e) => !hs.includes((e.textContent || "").trim())).length;
      }
      return n;
    },
    [headings, tag] as [string[], string],
  );
}
