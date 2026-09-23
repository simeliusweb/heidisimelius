// Contact + booking form UI (L): C1, C2, C4, C13, C14, C15, C18. Every /api/send-email call is
// intercepted in the browser here; nothing reaches the API (R5).
import type { Page, Route } from "@playwright/test";
import { spec, expect, record } from "../support/fixtures";
import { gotoSettled } from "../support/site";

const BOOKING = "/bilebandi-heidi-and-the-hot-stuff";

/** Captures (and answers) every send-email POST; the test decides the response. */
async function interceptSend(page: Page, respond: (route: Route) => Promise<void> = (r) => r.fulfill({ status: 200, contentType: "application/json", body: '{"success":true}' })) {
  const calls: unknown[] = [];
  await page.route("**/api/send-email", async (route) => {
    calls.push(route.request().postDataJSON());
    await respond(route);
  });
  return calls;
}

async function fillContact(page: Page, v: { name?: string; email?: string; message?: string }) {
  const f = page.locator("#contact-section form");
  if (v.name !== undefined) await f.getByPlaceholder("Kirjoita aihe...").fill(v.name);
  if (v.email !== undefined) await f.getByPlaceholder("Kirjoita sähköpostisi...").fill(v.email);
  if (v.message !== undefined) await f.getByPlaceholder("Kirjoita viestisi...").fill(v.message);
  return f;
}

async function pickFutureDate(page: Page) {
  // The trigger's accessible name comes from its form label ("Päivämäärä").
  await page.getByText("Valitse päivämäärä").click();
  await page.getByRole("button", { name: /next month|seuraava/i }).click();
  await page.locator('[role="dialog"] button[name="day"]:not([disabled]):not(.day-outside)').filter({ hasText: /^15$/ }).first().click();
}

async function fillBooking(page: Page, v: Partial<Record<"name" | "phone" | "email" | "location" | "eventType" | "message", string>>, withDate = true) {
  if (v.name !== undefined) await page.getByPlaceholder("Nimi", { exact: true }).fill(v.name);
  if (v.phone !== undefined) await page.getByPlaceholder("Puhelinnumero").fill(v.phone);
  if (v.email !== undefined) await page.getByPlaceholder("Sähköposti").fill(v.email);
  if (v.location !== undefined) await page.getByPlaceholder("Sijainti").fill(v.location);
  if (v.eventType !== undefined) await page.getByPlaceholder("Tilaisuus").fill(v.eventType);
  if (v.message !== undefined) await page.getByPlaceholder("Kerro meille lisää tapahtumastasi...").fill(v.message);
  if (withDate) await pickFutureDate(page);
}

const VALID_BOOKING = { name: "Testi Henkilö", phone: "0401234567", email: "e2e@example.invalid", location: "Tampere", eventType: "Häät", message: "Automaattinen testi, ei lähetetä." };

spec({ id: "C1", title: "contact form validation in Finnish, no request", tier: "regression", env: ["L"], data: "read" }, async ({ page }) => {
  const calls = await interceptSend(page);
  await gotoSettled(page, "/");
  const f = page.locator("#contact-section form");
  await f.scrollIntoViewIfNeeded();
  await f.getByRole("button", { name: "Lähetä" }).click();
  await expect(f.getByText("Aihe vaaditaan")).toBeVisible();
  await expect(f.getByText("Viesti vaaditaan")).toBeVisible();
  await fillContact(page, { name: "Aihe", email: "e2e@example.invalid", message: "x".repeat(1001) });
  await f.getByRole("button", { name: "Lähetä" }).click();
  await expect(f.getByText(/liian pitkä/)).toBeVisible();
  expect(calls).toEqual([]);
});

spec({ id: "C2", title: "booking form validation, no request", tier: "regression", env: ["L"], data: "read" }, async ({ page }) => {
  const calls = await interceptSend(page);
  await gotoSettled(page, BOOKING);
  await page.getByRole("button", { name: /^Lähetä$/ }).click();
  for (const msg of ["Nimi on pakollinen", "Puhelinnumero on pakollinen", "Virheellinen sähköpostiosoite", "Päivämäärä on pakollinen", "Sijainti on pakollinen", "Tilaisuus on pakollinen", "Viesti on liian lyhyt"]) {
    await expect(page.getByText(msg)).toBeVisible();
  }
  expect(calls).toEqual([]);
});

spec({ id: "C4", title: "honeypot hidden; payload carries website:'' and elapsedMs>0", tier: "regression", env: ["L"], data: "read" }, async ({ page }) => {
  const calls = await interceptSend(page);
  await gotoSettled(page, "/");
  const hp = page.locator('#contact-section input[name="hs_extra"]');
  await expect(hp).toHaveAttribute("tabindex", "-1");
  await expect(hp).toHaveAttribute("autocomplete", "off");
  expect(await hp.evaluate((e) => e.closest("[aria-hidden='true']") !== null)).toBe(true);
  const hidden = await hp.evaluate((e) => {
    const w = e.closest(".sr-only") as HTMLElement | null;
    if (!w) return false;
    const cs = getComputedStyle(w);
    return cs.clip === "rect(0px, 0px, 0px, 0px)" && parseFloat(cs.width) <= 1 && cs.overflow === "hidden";
  });
  expect(hidden, "honeypot is visually hidden (sr-only wrapper)").toBe(true);
  await fillContact(page, { name: "E2E-TESTI aihe", email: "e2e@example.invalid", message: "Testiviesti" });
  await page.locator("#contact-section form").getByRole("button", { name: "Lähetä" }).click();
  await expect.poll(() => calls.length).toBe(1);
  const body = calls[0] as Record<string, unknown>;
  expect(body.website).toBe("");
  expect(typeof body.elapsedMs).toBe("number");
  expect(body.elapsedMs as number).toBeGreaterThanOrEqual(0);
  expect(body.formType).toBe("contact");
});

spec({ id: "C13", title: "send failures show a Finnish error with a fallback address and keep the form", tier: "known", env: ["L"], data: "read", extraTags: ["@FX13"] }, async ({ page }) => {
  let mode: "json500" | "html502" = "json500";
  await interceptSend(page, (r) =>
    mode === "json500"
      ? r.fulfill({ status: 500, contentType: "application/json", body: '{"success":false,"error":"Internal server error"}' })
      : r.fulfill({ status: 502, contentType: "text/html", body: "<html><body>Bad Gateway</body></html>" }),
  );
  await gotoSettled(page, "/");
  for (const m of ["json500", "html502"] as const) {
    mode = m;
    await fillContact(page, { name: "E2E-TESTI aihe", email: "e2e@example.invalid", message: "Testiviesti" });
    await page.locator("#contact-section form").getByRole("button", { name: "Lähetä" }).click();
    const toast = page.getByText(/Viestin lähetys epäonnistui/).first();
    await expect(toast, m).toBeVisible();
    // The contact form no longer names an address (Heidi's is her CMS login); the booking form uses the band's.
    await expect(page.getByText(/simelius\.heidi@gmail\.com/)).toHaveCount(0);
    await expect(page.getByText(/SyntaxError|Unexpected token|Internal server error/)).toHaveCount(0);
    await expect(page.getByPlaceholder("Kirjoita viestisi...")).toHaveValue("Testiviesti");
  }
});

spec({ id: "C14", title: "double submit sends once and shows a pending state", tier: "known", env: ["L"], data: "read", extraTags: ["@FX13"] }, async ({ page }) => {
  const calls = await interceptSend(page, async (r) => {
    await new Promise((res) => setTimeout(res, 2000));
    await r.fulfill({ status: 200, contentType: "application/json", body: '{"success":true}' });
  });
  await gotoSettled(page, "/");
  await fillContact(page, { name: "E2E-TESTI aihe", email: "e2e@example.invalid", message: "Testiviesti" });
  const btn = page.locator("#contact-section form").getByRole("button", { name: /Lähetä|Lähetetään/ });
  await btn.dblclick();
  await expect(page.locator("#contact-section form").getByRole("button", { name: "Lähetetään..." })).toBeDisabled();
  await page.waitForTimeout(3000);
  expect(calls.length).toBe(1);
});

spec({ id: "C15", title: "booking client rules: blank name, 2001-char message, 101-char name", tier: "known", env: ["L"], data: "read", extraTags: ["@FX13"] }, async ({ page }) => {
  const calls = await interceptSend(page);
  await gotoSettled(page, BOOKING);
  await fillBooking(page, { ...VALID_BOOKING, name: "  " });
  await page.getByRole("button", { name: /^Lähetä$/ }).click();
  await expect(page.getByText("Nimi on pakollinen")).toBeVisible();
  await fillBooking(page, { name: "N".repeat(101), message: "m".repeat(2001) }, false);
  await page.getByRole("button", { name: /^Lähetä$/ }).click();
  await expect(page.getByText(/Nimi on liian pitkä/)).toBeVisible();
  await expect(page.getByText(/Viesti on liian pitkä/)).toBeVisible();
  expect(calls).toEqual([]);
});

spec({ id: "C18", title: "autofill-like filling never fills the honeypot", tier: "regression", env: ["L"], data: "read" }, async ({ page }, info) => {
  const calls = await interceptSend(page);
  await gotoSettled(page, BOOKING);
  // Headless Chrome can't run real autofill; fill every visible text input the way an autofiller would.
  await fillBooking(page, VALID_BOOKING);
  const hp = page.locator('input[name="hs_extra"]');
  expect(await hp.inputValue()).toBe("");
  await page.getByRole("button", { name: /^Lähetä$/ }).click();
  await expect.poll(() => calls.length).toBe(1);
  expect((calls[0] as Record<string, unknown>).website).toBe("");
  record(info, "note", "password-manager autofill (1Password/LastPass) is a manual check");
});
