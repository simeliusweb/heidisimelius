// Gig CMS (L, new DB, test admin): B6, B7, B17, B18, B24–B31. Only E2E-TESTI rows/objects are written
// (data class T); they're ledgered and swept by B15. Assertions read the DB over anon REST.
import fs from "node:fs";
import type { Page } from "@playwright/test";
import { spec, expect, record, test } from "../support/fixtures";
import { BASE_URL, NEW_REF, REPO, secrets } from "../support/env";
import { TAG, gigRows, helsinkiToUtc, makeImage, openAdminTab, recordRows, setPerformance, tomorrow, trackUploads } from "../support/cms";
import { gotoSettled, jsonLd, eventsOf, cardOf, expandAll } from "../support/site";

const CMS = { env: ["L"] as ("L")[], cmsWrite: true, data: "test-rows" as const };
/** A title unique to this attempt, so a retry never trips over rows from an earlier one. */
const uniq = (id: string) => `${TAG}-${id}-${Date.now().toString(36).slice(-5)}`;

async function openAddGig(page: Page) {
  await openAdminTab(page, "Keikat");
  await page.getByRole("button", { name: "Lisää uusi keikka" }).click();
  // Named: the calendar popover is a (nameless) dialog too.
  const dialog = page.getByRole("dialog", { name: "Lisää uusi keikka" });
  await expect(dialog).toBeVisible();
  return dialog;
}

interface GigInput { title: string; image?: { name: string; mimeType: string; buffer: Buffer } | string | null; times?: string[]; date?: Date; optional?: boolean; type?: "Musiikki" | "Teatteri" }

async function fillGig(page: Page, dialog: ReturnType<Page["getByRole"]>, g: GigInput) {
  await dialog.getByPlaceholder("Otsikko").fill(g.title);
  await dialog.getByPlaceholder("Paikka").fill(`${TAG} paikka`);
  await dialog.getByPlaceholder("Kaupunki").fill("Tampere");
  if (g.type === "Teatteri") {
    await dialog.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Teatteri" }).click();
  }
  if (g.image !== null) await dialog.locator('input[type="file"]').setInputFiles(g.image || { name: `${TAG}.jpg`, mimeType: "image/jpeg", buffer: await makeImage(page) });
  await dialog.getByPlaceholder("Kuvan alt-teksti").fill(`${TAG} alt`);
  await dialog.getByPlaceholder("Kuvaus").fill(`${TAG} kuvaus`);
  const times = g.times || ["19:00"];
  for (let i = 1; i < times.length; i++) await dialog.getByRole("button", { name: "Lisää uusi esityspäivä" }).click();
  for (let i = 0; i < times.length; i++) await setPerformance(page, dialog, i, g.date || tomorrow(), times[i]);
  if (g.optional !== false) {
    await dialog.getByPlaceholder("Tapahtuman sivu (URL)").fill("https://example.com/e2e-tapahtuma");
    await dialog.getByPlaceholder("Lippulinkki (URL)").fill("https://example.com/e2e-liput");
    await dialog.getByPlaceholder("Järjestäjä", { exact: true }).fill(`${TAG} järjestäjä`);
    await dialog.getByPlaceholder("Järjestäjän sivu (URL)").fill("https://example.com/e2e-jarjestaja");
  }
}

async function createGig(page: Page, g: GigInput) {
  const uploads = trackUploads(page);
  const dialog = await openAddGig(page);
  await fillGig(page, dialog, g);
  await dialog.getByRole("button", { name: "Tallenna", exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 30_000 });
  await expect.poll(async () => (await gigRows(g.title)).length, { timeout: 15_000 }).toBe((g.times || ["19:00"]).length);
  const rows = await gigRows(g.title);
  await recordRows("gigs", rows.map((r) => r.id));
  return { rows, uploads };
}

async function rowMenu(page: Page, title: string, index = 0) {
  await openAdminTab(page, "Keikat");
  const row = page.getByRole("row").filter({ hasText: title }).nth(index);
  await row.getByRole("button", { name: "Avaa valikko" }).click();
}

spec({ id: "B6", title: "gig create: 2 performances tomorrow, image, all optional fields", tier: "gate", ...CMS }, async ({ page }) => {
  const title = uniq("B6");
  const { rows, uploads } = await createGig(page, { title, times: ["19:00", "21:00"] });
  expect(rows.length).toBe(2);
  expect(new Set(rows.map((r) => r.gig_group_id)).size).toBe(1);
  expect(rows[0].image_url).toMatch(new RegExp(`^https://${NEW_REF}\\.supabase\\.co/storage/v1/object/public/gigs-images/`));
  expect(uploads.length).toBe(1);
  expect(rows.map((r) => r.performance_date).map((d) => new Date(d).toISOString())).toEqual([helsinkiToUtc(tomorrow(), "19:00"), helsinkiToUtc(tomorrow(), "21:00")].map((d) => new Date(d).toISOString()));
  expect(rows[0].organizer_name).toBe(`${TAG} järjestäjä`);
  // Public pages: grouped card on /keikat, card on home, 2 events in the JSON-LD.
  await gotoSettled(page, "/keikat");
  const card = cardOf(page, title);
  await expect(card.getByText(/^klo (19|21):00$/)).toHaveCount(2);
  await expect(card.locator("img")).toHaveAttribute("src", rows[0].image_url);
  expect(eventsOf(await jsonLd(page)).filter((e) => e.name === title).length).toBe(2);
  await gotoSettled(page, "/");
  await expect(page.locator('a[href^="/keikat#"]').filter({ hasText: title })).toHaveCount(1);
});

spec({ id: "B7", title: "gig edit (title + image) and delete both performances", tier: "gate", ...CMS }, async ({ page }) => {
  const title = uniq("B7");
  if ((await gigRows(title)).length === 0) await createGig(page, { title, times: ["19:00", "21:00"] });
  const uploads = trackUploads(page);
  await rowMenu(page, title);
  await page.getByRole("menuitem", { name: "Muokkaa" }).click();
  const dialog = page.getByRole("dialog", { name: "Muokkaa keikkaa" });
  await expect(dialog).toBeVisible();
  const edited = `${title}-muokattu`;
  await dialog.getByPlaceholder("Otsikko").fill(edited);
  await dialog.locator('input[type="file"]').setInputFiles({ name: `${TAG}-b7.png`, mimeType: "image/png", buffer: await makeImage(page, 500, 500, "image/png") });
  await dialog.getByRole("button", { name: "Tallenna muutokset" }).click();
  await expect(dialog).toBeHidden({ timeout: 30_000 });
  const e = await gigRows(edited);
  expect(e.length, "edit changes that one performance row").toBe(1);
  expect(e[0].image_url).toContain(uploads[0]?.split("/").slice(1).join("/") ?? "gigs-images");
  await recordRows("gigs", e.map((r) => r.id));
  // The card shows the group's first performance, so the renamed row shows up in the JSON-LD (FU13: rows are edited one at a time).
  await gotoSettled(page, "/keikat");
  expect(eventsOf(await jsonLd(page)).filter((ev) => ev.name === edited).length).toBe(1);
  // Delete every row of both titles.
  for (const t of [edited, title]) {
    while ((await gigRows(t)).length) {
      await rowMenu(page, t);
      await page.getByRole("menuitem", { name: "Poista" }).click();
      await page.getByRole("button", { name: "Kyllä, poista" }).click();
      await expect(page.getByRole("alertdialog")).toBeHidden();
      await page.waitForTimeout(800);
    }
  }
  await gotoSettled(page, "/keikat");
  await expect(page.getByRole("heading", { level: 2, name: new RegExp(title) })).toHaveCount(0);
});

spec({ id: "B24", title: "edit a gig whose optional fields are NULL", tier: "known", ...CMS, extraTags: ["@FX4"] }, async ({ page }) => {
  const title = uniq("B24");
  if ((await gigRows(title)).length === 0) await createGig(page, { title, optional: false });
  const [row] = await gigRows(title);
  expect(row.event_page_url).toBeNull();
  await rowMenu(page, title);
  await page.getByRole("menuitem", { name: "Muokkaa" }).click();
  const dialog = page.getByRole("dialog", { name: "Muokkaa keikkaa" });
  await dialog.getByPlaceholder("Otsikko").fill(`${title}-2`);
  await dialog.getByRole("button", { name: "Tallenna muutokset" }).click();
  await expect(dialog).toBeHidden({ timeout: 20_000 });
  const [after] = await gigRows(`${title}-2`);
  expect(after?.id).toBe(row.id);
  expect(after.event_page_url).toBeNull();
  expect(after.organizer_name).toBeNull();
});

spec({ id: "B25", title: "copy a gig: new row and group, same image, today 19:00, original unchanged", tier: "regression", ...CMS }, async ({ page }) => {
  const title = uniq("B25");
  const { rows: [orig] } = (await gigRows(title)).length ? { rows: await gigRows(title) } : await createGig(page, { title, type: "Teatteri" });
  await rowMenu(page, title);
  await page.getByRole("menuitem", { name: "Kopioi" }).click();
  const dialog = page.getByRole("dialog", { name: "Kopioi keikka" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Luo kopio" }).click();
  await expect(dialog).toBeHidden({ timeout: 20_000 });
  const rows = await gigRows(title);
  await recordRows("gigs", rows.map((r) => r.id));
  expect(rows.length).toBe(2);
  const copy = rows.find((r) => r.id !== orig.id)!;
  expect(copy.gig_group_id).not.toBe(orig.gig_group_id);
  expect(copy.image_url).toBe(orig.image_url);
  expect(copy.gig_type, "Teatteri copies as Teatteri").toBe("Teatteri");
  const stored = new Date(copy.performance_date);
  expect(Math.floor(stored.getTime() / 60_000), "today 19:00 Helsinki").toBe(Math.floor(new Date(helsinkiToUtc(new Date(), "19:00")).getTime() / 60_000));
  // Finding: the default "today" date keeps the current seconds (setHours(h, m) doesn't zero them).
  if (stored.getUTCSeconds() || stored.getUTCMilliseconds()) record(test.info(), "finding: stray seconds in performance_date", copy.performance_date);
  const again = rows.find((r) => r.id === orig.id)!;
  expect(again).toEqual(orig);
});

spec({ id: "B26", title: "performance groups: edit one row, delete one leaves one", tier: "regression", ...CMS }, async ({ page }) => {
  const title = uniq("B26");
  if ((await gigRows(title)).length === 0) await createGig(page, { title, times: ["18:00", "20:00"] });
  const before = await gigRows(title);
  await rowMenu(page, title, 1);
  await page.getByRole("menuitem", { name: "Muokkaa" }).click();
  const dialog = page.getByRole("dialog", { name: "Muokkaa keikkaa" });
  await dialog.getByPlaceholder("Paikka").fill(`${TAG} toinen paikka`);
  await dialog.getByRole("button", { name: "Tallenna muutokset" }).click();
  await expect(dialog).toBeHidden({ timeout: 20_000 });
  const after = await gigRows(title);
  const changed = after.filter((r) => (r as unknown as { venue: string }).venue === `${TAG} toinen paikka`);
  expect(changed.length).toBe(1);
  await rowMenu(page, title, 0);
  await page.getByRole("menuitem", { name: "Poista" }).click();
  await page.getByRole("button", { name: "Kyllä, poista" }).click();
  await expect.poll(async () => (await gigRows(title)).length).toBe(before.length - 1);
});

spec({ id: "B27", title: "gig form validation", tier: "regression", env: ["L"], cmsWrite: true, data: "read" }, async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (r) => { if (r.method() !== "GET" && /\/rest\/v1\/gigs|\/storage\/v1\/object\/gigs-images/.test(r.url())) requests.push(r.url()); });
  const dialog = await openAddGig(page);
  // Time field normalisation
  const t = dialog.getByPlaceholder("HH:MM").first();
  await t.fill("2"); await t.blur();
  await expect(t).toHaveValue("02:00");
  await t.fill("25"); await expect(t).toHaveValue(/^23/);
  // No performances
  await dialog.locator("div.border.rounded-md").filter({ has: page.getByPlaceholder("HH:MM") }).first().getByRole("button").last().click();
  await dialog.getByPlaceholder("Tapahtuman sivu (URL)").fill("www.x.fi");
  await dialog.getByRole("button", { name: "Tallenna", exact: true }).click();
  await expect(dialog.getByText("Anna kelvollinen URL.").first()).toBeVisible();
  // No image → toast, no request
  await dialog.getByPlaceholder("Tapahtuman sivu (URL)").fill("");
  await dialog.getByPlaceholder("Otsikko").fill(`${TAG}-B27`);
  await dialog.getByRole("button", { name: "Tallenna", exact: true }).click();
  await page.waitForTimeout(1500);
  expect(requests).toEqual([]);
  await page.keyboard.press("Escape");
});

spec({ id: "B28", title: "gig timezone: 19:00 winter → 17:00Z, summer → 16:00Z; shown as 19:00", tier: "gate", ...CMS }, async ({ page }) => {
  const b28 = uniq("B28");
  const winter = new Date(new Date().getFullYear() + 1, 0, 15);
  const summer = new Date(new Date().getFullYear() + 1, 5, 15);
  for (const [label, date] of [["winter", winter], ["summer", summer]] as const) {
    const title = `${b28}-${label}`;
    if ((await gigRows(title)).length === 0) await createGig(page, { title, date, times: ["19:00"] });
    const [row] = await gigRows(title);
    expect(new Date(row.performance_date).getUTCHours(), label).toBe(label === "winter" ? 17 : 16);
  }
  await gotoSettled(page, "/keikat");
  await expandAll(page);
  for (const label of ["winter", "summer"]) {
    const card = cardOf(page, `${b28}-${label}`);
    await expect(card.getByText("klo 19:00")).toBeVisible();
  }
});


spec({ id: "B29", title: "image file edge cases (names, HEIC, no extension, 55 MB)", tier: "regression", ...CMS }, async ({ page }, info) => {
  test.setTimeout(240_000);
  const b29 = uniq("B29");
  const jpeg = await makeImage(page, 400, 300, "image/jpeg");
  const r1 = await createGig(page, { title: `${b29}-a`, image: { name: "Kesä keikka ä ö.JPG", mimeType: "image/jpeg", buffer: jpeg } });
  expect(r1.uploads[0]).toMatch(/^gigs-images\/public\/[0-9a-f-]{36}\.JPG$/i);
  const head = await fetch(r1.rows[0].image_url, { headers: { Range: "bytes=0-0" } });
  expect(head.headers.get("content-type")).toBe("image/jpeg");
  const obs: Record<string, unknown> = {};
  // HEIC and extension-less: record what happens.
  for (const [k, file] of [["heic", { name: `${TAG}.heic`, mimeType: "image/heic", buffer: jpeg }], ["noext", { name: `${TAG}-noext`, mimeType: "image/jpeg", buffer: jpeg }]] as const) {
    const title = `${b29}-${k}`;
    try {
      const r = await createGig(page, { title, image: file });
      obs[k] = { stored: r.uploads[0], type: (await fetch(r.rows[0].image_url, { headers: { Range: "bytes=0-0" } })).headers.get("content-type") };
    } catch (e) {
      obs[k] = `not saved: ${(e as Error).message.slice(0, 80)}`;
      await page.keyboard.press("Escape");
    }
  }
  // 55 MB → error toast, no row.
  // Buffers over 50 MB must go through a file.
  const bigPath = test.info().outputPath("iso-55mb.jpg");
  const big = Buffer.alloc(55 * 1024 * 1024, 0xff);
  jpeg.copy(big, 0, 0, Math.min(jpeg.length, 1024));
  fs.writeFileSync(bigPath, big);
  const dialog = await openAddGig(page);
  await fillGig(page, dialog, { title: `${b29}-big`, image: bigPath, optional: false });
  await dialog.getByRole("button", { name: "Tallenna", exact: true }).click();
  await expect(page.getByText("Virhe prosessissa").first()).toBeVisible({ timeout: 60_000 });
  expect((await gigRows(`${b29}-big`)).length).toBe(0);
  await page.keyboard.press("Escape");
  record(info, "observations", obs);
});

spec({ id: "B30", title: "upload ok but insert fails: toast, no row, orphan ledgered", tier: "regression", ...CMS }, async ({ page }) => {
  const b30 = uniq("B30");
  const uploads = trackUploads(page);
  await page.route(/\/rest\/v1\/gigs/, (r) => (r.request().method() === "POST" ? r.fulfill({ status: 500, contentType: "application/json", body: '{"message":"e2e forced failure"}' }) : r.continue()));
  const dialog = await openAddGig(page);
  await fillGig(page, dialog, { title: b30, optional: false });
  await dialog.getByRole("button", { name: "Tallenna", exact: true }).click();
  await expect(page.getByText(/Virhe/).first()).toBeVisible();
  await expect(dialog).toBeVisible();
  expect((await gigRows(b30)).length).toBe(0);
  expect(uploads.length, "the orphaned upload is in the ledger").toBe(1);
  await page.keyboard.press("Escape");
});

spec({ id: "B31", title: "public page is fresh in the same session after a CMS edit", tier: "regression", ...CMS }, async ({ page }) => {
  const title = uniq("B31");
  await createGig(page, { title });
  await page.getByRole("button", { name: "Toggle menu" }).click().catch(() => {});
  await page.locator("nav").first().getByRole("link", { name: "Keikat", exact: true }).click();
  await page.waitForURL(/\/keikat$/);
  await expect(page.getByRole("heading", { level: 2, name: title })).toHaveCount(1, { timeout: 15_000 });
});

spec({ id: "B17", title: "token refresh while editing (clock +65 min)", tier: "gate", env: ["L"], cmsWrite: true, data: "test-rows" }, async ({ page }) => {
  // Own session: fast-forwarding rotates the refresh token, which must not touch the shared test-admin state.
  const title = uniq("B17");
  if ((await gigRows(title)).length === 0) await createGig(page, { title, optional: false });
  const ctx = await page.context().browser()!.newContext({ baseURL: BASE_URL, storageState: `${REPO}/e2e/.auth/state.json`, timezoneId: "Europe/Helsinki" });
  const p = await ctx.newPage();
  await p.clock.install();
  await p.clock.resume();
  await p.goto("/login");
  await p.getByPlaceholder("Sähköposti").fill(secrets.TEST_ADMIN_EMAIL);
  await p.getByPlaceholder("••••••••").fill(secrets.TEST_ADMIN_PASSWORD);
  await p.getByRole("button", { name: "Kirjaudu sisään" }).click();
  await p.waitForURL(/\/admin$/);
  const order: string[] = [];
  p.on("request", (r) => { if (/token\?grant_type=refresh_token/.test(r.url())) order.push("refresh"); else if (r.method() === "PATCH" && r.url().includes("/rest/v1/gigs")) order.push("patch"); });
  await p.clock.fastForward(65 * 60_000);
  await rowMenu(p, title);
  await p.getByRole("menuitem", { name: "Muokkaa" }).click();
  const d17 = p.getByRole("dialog", { name: "Muokkaa keikkaa" });
  await d17.getByPlaceholder("Kuvaus").fill(`${TAG} päivitetty token-testissä`);
  await d17.getByRole("button", { name: "Tallenna muutokset" }).click();
  await expect(d17).toBeHidden({ timeout: 20_000 });
  expect(order.indexOf("refresh")).toBeGreaterThanOrEqual(0);
  expect(order.indexOf("refresh")).toBeLessThan(order.indexOf("patch"));
  const [row] = await gigRows(title);
  expect((row as unknown as { description: string }).description).toBe(`${TAG} päivitetty token-testissä`);
  await ctx.close();
});

spec({ id: "B18", title: "refresh fails mid-edit: error, row unchanged, no false success", tier: "known", env: ["L"], cmsWrite: true, data: "test-rows", extraTags: ["@FX11"] }, async ({ page }, info) => {
  const title = uniq("B18");
  if ((await gigRows(title)).length === 0) await createGig(page, { title, optional: false });
  const [before] = await gigRows(title);
  await rowMenu(page, title);
  await page.getByRole("menuitem", { name: "Muokkaa" }).click();
  // Corrupt the session: every REST write now gets 401 and every refresh fails.
  await page.route(/\/auth\/v1\/token\?grant_type=refresh_token/, (r) => r.fulfill({ status: 400, contentType: "application/json", body: '{"error":"invalid_grant"}' }));
  await page.route(/\/rest\/v1\/gigs/, (r) => (r.request().method() === "PATCH" ? r.fulfill({ status: 401, contentType: "application/json", body: '{"code":"PGRST301","message":"JWT expired"}' }) : r.continue()));
  const d18 = page.getByRole("dialog", { name: "Muokkaa keikkaa" });
  await d18.getByPlaceholder("Kuvaus").fill("ei saa tallentua");
  await d18.getByRole("button", { name: "Tallenna muutokset" }).click();
  await page.waitForTimeout(3000);
  record(info, "toasts", await page.locator("li[role='status'], [data-sonner-toast]").allInnerTexts());
  await expect(page.getByText("Onnistui!")).toHaveCount(0);
  const [after] = await gigRows(title);
  expect(after).toEqual(before);
});

