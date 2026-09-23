// CMS helpers: admin navigation, test files, upload ledger, DB assertions via anon REST.
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { NEW_REF, RUN_ID } from "./env";
import { anonGet, ledgerAdd } from "./rest";

export const TAG = `E2E-TESTI-${RUN_ID}`;

/** Record every storage upload the page makes (exact keys for the B15 cleanup). */
export function trackUploads(page: Page) {
  const keys: string[] = [];
  page.on("request", (req) => {
    const m = req.url().match(/\.supabase\.co\/storage\/v1\/object\/(?!public\/|list\/|sign\/|move|copy)([^?]+)/);
    if (m && (req.method() === "POST" || req.method() === "PUT")) {
      const key = decodeURIComponent(m[1]);
      keys.push(key);
      ledgerAdd("objects", key);
    }
  });
  return keys;
}

export async function openAdminTab(page: Page, tab: "Keikat" | "Galleria" | "Videot" | "Bio" | "Kuvat" | "Laulunopetus") {
  if (!page.url().endsWith("/admin")) await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Sisällön hallinta" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("tab", { name: tab, exact: true }).click();
  await expect(page.getByRole("tab", { name: tab, exact: true })).toHaveAttribute("data-state", "active");
}

/** A real image rendered by the browser (JPEG/PNG/WebP) of the given size. */
export async function makeImage(page: Page, w = 640, h = 400, type: "image/jpeg" | "image/png" | "image/webp" = "image/jpeg", label = TAG): Promise<Buffer> {
  const dataUrl = await page.evaluate(
    ([w, h, type, label]) => {
      const c = document.createElement("canvas");
      c.width = w as number;
      c.height = h as number;
      const x = c.getContext("2d")!;
      const g = x.createLinearGradient(0, 0, w as number, h as number);
      g.addColorStop(0, "#E52545");
      g.addColorStop(1, "#10111A");
      x.fillStyle = g;
      x.fillRect(0, 0, w as number, h as number);
      x.fillStyle = "#fff";
      x.font = "32px sans-serif";
      x.fillText(String(label), 20, 60);
      return c.toDataURL(type as string, 0.8);
    },
    [w, h, type, label] as [number, number, string, string],
  );
  return Buffer.from(dataUrl.split(",")[1], "base64");
}

export const tinyPdf = (label = TAG) =>
  Buffer.from(
    `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n% ${label}\ntrailer<</Root 1 0 R>>\n%%EOF\n`,
  );

export async function gigRows(title: string) {
  return anonGet<{ id: string; title: string; gig_group_id: string; image_url: string; performance_date: string; image_alt: string; gig_type: string; event_page_url: string | null; organizer_name: string | null }>(
    NEW_REF,
    `gigs?select=*&title=eq.${encodeURIComponent(title)}&order=performance_date.asc`,
  );
}

export async function recordRows(table: string, ids: string[]) {
  for (const id of ids) ledgerAdd("rows", `${table}:${id}`);
}

/** Set one performance row's date (via the calendar) and time. */
export async function setPerformance(page: Page, dialog: ReturnType<Page["locator"]>, index: number, date: Date, time: string) {
  const rows = dialog.locator("div.border.rounded-md").filter({ has: page.getByPlaceholder("HH:MM") });
  const row = rows.nth(index);
  await row.getByRole("button").first().click();
  const pop = page.locator("[data-radix-popper-content-wrapper]").last();
  await expect(pop).toBeVisible();
  const monthsAhead = (date.getFullYear() - new Date().getFullYear()) * 12 + date.getMonth() - new Date().getMonth();
  for (let i = 0; i < monthsAhead; i++) await pop.getByRole("button", { name: /next|seuraava/i }).click();
  await pop.locator('button[name="day"]:not(.day-outside)').filter({ hasText: new RegExp(`^${date.getDate()}$`) }).first().click();
  // The calendar stays open after a pick; Escape closes only the top layer (the popover).
  if (await pop.isVisible()) await page.keyboard.press("Escape");
  await expect(pop).toBeHidden();
  const t = row.getByPlaceholder("HH:MM");
  await t.fill(time.replace(":", ""));
  await t.blur();
}

export function tomorrow(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
}

/** Helsinki wall-clock "HH:MM" on a date → UTC ISO string (what the CMS stores). */
export function helsinkiToUtc(date: Date, hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const y = date.getFullYear(), mo = date.getMonth(), d = date.getDate();
  for (const offset of [2, 3]) {
    const guess = new Date(Date.UTC(y, mo, d, h - offset, m));
    const shown = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Helsinki", hour: "2-digit", minute: "2-digit", hour12: false }).format(guess);
    if (shown === hhmm) return guess.toISOString();
  }
  throw new Error("no Helsinki offset matched");
}

export async function toastText(page: Page) {
  return page.locator("[data-sonner-toast], li[role='status'], [role='status']").allInnerTexts();
}
