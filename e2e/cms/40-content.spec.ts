// Page content CMS (L, new DB; data class D = restored by the X2 re-import, never via the UI):
// B11, B12, B13, B14, B39, B40, B41, B42, B43, B44, B45, B46.
import crypto from "node:crypto";
import type { Page } from "@playwright/test";
import { spec, expect, record, test } from "../support/fixtures";
import { NEW_REF } from "../support/env";
import { TAG, makeImage, openAdminTab, tinyPdf, trackUploads } from "../support/cms";
import { anonGet } from "../support/rest";
import { gotoSettled, jsonLd } from "../support/site";

type Content = Record<string, unknown>;
const content = async (name: string) => (await anonGet<{ content: Content; updated_at: string }>(NEW_REF, `page_content?select=content,updated_at&page_name=eq.${name}`))[0];
const D = { env: ["L"] as ("L")[], cmsWrite: true, data: "mutates-real" as const };

async function saveBio(page: Page) {
  await page.getByRole("button", { name: "Tallenna muutokset" }).last().click();
  await expect(page.getByRole("button", { name: "Tallennetaan..." })).toHaveCount(0, { timeout: 60_000 });
}

spec({ id: "B11", title: "bio text and image edit → /bio updates", tier: "gate", ...D }, async ({ page }) => {
  trackUploads(page);
  const before = await content("bio");
  await openAdminTab(page, "Bio");
  const intro = page.getByPlaceholder("Kirjoita johdantokappaleet tähän...");
  const newIntro = `${TAG} johdanto.\n${String(before.content.introParagraphs).split("\n")[0]}`;
  await intro.fill(newIntro);
  await page.locator('input[type="file"][accept="image/*"]').first().setInputFiles({ name: `${TAG}-bio.jpg`, mimeType: "image/jpeg", buffer: await makeImage(page, 800, 1000) });
  await saveBio(page);
  await expect.poll(async () => String((await content("bio")).content.introParagraphs)).toBe(newIntro);
  const after = await content("bio");
  const img1 = (after.content.bioImage1 as { src: string }).src;
  expect(img1).not.toBe((before.content.bioImage1 as { src: string }).src);
  expect(img1).toContain(`${NEW_REF}.supabase.co`);
  await gotoSettled(page, "/bio");
  await expect(page.getByText(`${TAG} johdanto.`)).toBeVisible();
  await expect(page.locator(`img[src="${img1}"]`).first()).toBeAttached();
});

spec({ id: "B12", title: "CV upsert: same path, new bytes; record cache-control", tier: "gate", ...D }, async ({ page }, info) => {
  const before = await content("bio");
  const cvUrl = String(before.content.cvUrl);
  const md5 = async () => crypto.createHash("md5").update(Buffer.from(await (await fetch(`${cvUrl}?e2e=${Date.now()}`, { cache: "no-store" })).arrayBuffer())).digest("hex");
  const m0 = await md5();
  await openAdminTab(page, "Bio");
  await page.locator('input[type="file"][accept=".pdf"]').setInputFiles({ name: `${TAG}.pdf`, mimeType: "application/pdf", buffer: tinyPdf() });
  await saveBio(page);
  const after = await content("bio");
  expect(String(after.content.cvUrl).split("?")[0], "same path").toBe(cvUrl.split("?")[0]);
  await expect.poll(md5, { timeout: 30_000 }).not.toBe(m0);
  const r = await fetch(cvUrl, { headers: { Range: "bytes=0-0" } });
  record(info, "cv headers", { cacheControl: r.headers.get("cache-control"), cfCache: r.headers.get("cf-cache-status"), age: r.headers.get("age") });
  record(info, "restore", "copy-storage.mjs always re-copies the CV (≥ 1 h before 8.3; md5 checked at 8.3)");
});

spec({ id: "B13", title: "page images: keikat hero (single) and bio hero (dual) replaced", tier: "gate", ...D }, async ({ page }) => {
  trackUploads(page);
  const before = await content("page_images");
  await openAdminTab(page, "Kuvat");
  const keikat = page.locator("div").filter({ has: page.getByText("Keikat-sivun pääkuva", { exact: true }) }).filter({ has: page.locator('input[type="file"]') }).last();
  await keikat.locator('input[type="file"]').setInputFiles({ name: `${TAG}-keikat.jpg`, mimeType: "image/jpeg", buffer: await makeImage(page, 1600, 900) });
  await keikat.getByPlaceholder("Kuvaile kuvaa").fill(`${TAG} keikat hero`);
  await keikat.getByPlaceholder("Valokuvaajan nimi").fill(`${TAG} kuvaaja`);
  await keikat.getByRole("button", { name: /Päivitä/ }).click();
  await expect.poll(async () => ((await content("page_images")).content.keikat_hero as { src: string }).src, { timeout: 60_000 }).not.toBe((before.content.keikat_hero as { src: string }).src);
  const bio = page.locator("div").filter({ has: page.getByText("Bio-sivun pääkuva", { exact: true }) }).filter({ has: page.locator('input[type="file"]') }).last();
  const files = bio.locator('input[type="file"]');
  await files.nth(0).setInputFiles({ name: `${TAG}-bio-d.jpg`, mimeType: "image/jpeg", buffer: await makeImage(page, 1600, 900) });
  await files.nth(1).setInputFiles({ name: `${TAG}-bio-m.jpg`, mimeType: "image/jpeg", buffer: await makeImage(page, 800, 1200) });
  await bio.getByPlaceholder("Kuvaile desktop-kuvaa").fill(`${TAG} desktop`);
  await bio.getByPlaceholder("Kuvaile mobiilikuvaa").fill(`${TAG} mobile`);
  for (const f of await bio.getByPlaceholder("Valokuvaajan nimi").all()) await f.fill(`${TAG} kuvaaja`);
  await bio.getByRole("button", { name: /Päivitä/ }).click();
  await expect.poll(async () => ((await content("page_images")).content.bio_hero as { desktop: { alt: string } }).desktop.alt, { timeout: 60_000 }).toBe(`${TAG} desktop`);
  const now = (await content("page_images")).content as { keikat_hero: { src: string } };
  await gotoSettled(page, "/keikat");
  const bg = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[style*='background-image']")].map((e) => e.style.backgroundImage).join(" "));
  expect(bg).toContain(now.keikat_hero.src);
});

spec({ id: "B14", title: "laulunopetus: pricingVisible toggles prices on the page and in JSON-LD; CTA edit", tier: "gate", ...D }, async ({ page }) => {
  const before = await content("laulunopetus");
  const wasVisible = before.content.pricingVisible !== false;
  await openAdminTab(page, "Laulunopetus");
  await page.getByLabel("Näytä hinnasto sivulla").click();
  await page.getByPlaceholder("Painikkeen teksti...").first().fill(`${TAG} CTA`);
  await page.getByRole("button", { name: "Tallenna muutokset" }).last().click();
  await expect.poll(async () => (await content("laulunopetus")).content.pricingVisible, { timeout: 30_000 }).toBe(!wasVisible);
  await gotoSettled(page, "/laulunopetus");
  const title = String(before.content.pricingTitle);
  await expect(page.getByRole("heading", { name: title, exact: true })).toHaveCount(wasVisible ? 0 : 1);
  const service = (await jsonLd(page)).find((j) => (j as { "@type"?: string })["@type"] === "Service") as Record<string, unknown>;
  expect(Boolean(service?.offers || service?.hasOfferCatalog), "offers in JSON-LD").toBe(!wasVisible);
  await expect(page.getByText(`${TAG} CTA`).first()).toBeVisible();
});

spec({ id: "B39", title: "bio validation and YouTube transform", tier: "regression", env: ["L"], cmsWrite: true, data: "mutates-real" }, async ({ page }) => {
  await openAdminTab(page, "Bio");
  const video = page.getByPlaceholder("URL-osoite");
  await video.fill("https://vimeo.com/123456");
  await saveBio(page);
  await expect(page.getByText(/Anna kelvollinen YouTube-video-URL/)).toBeVisible();
  await page.getByPlaceholder("Kirjoita johdantokappaleet tähän...").fill("lyhyt");
  await saveBio(page);
  await expect(page.getByText("Johdantoteksti on pakollinen.")).toBeVisible();
  const before = await content("bio");
  await page.getByPlaceholder("Kirjoita johdantokappaleet tähän...").fill(String(before.content.introParagraphs));
  await video.fill("https://youtu.be/nNooz5tHV6U");
  await saveBio(page);
  await expect.poll(async () => (await content("bio")).content.featuredVideoUrl).toBe("https://www.youtube.com/embed/nNooz5tHV6U");
});

spec({ id: "B40", title: "credit delete while another field is invalid (record, FU8)", tier: "record", ...D }, async ({ page }, info) => {
  await openAdminTab(page, "Bio");
  await page.getByPlaceholder("Kirjoita johdantokappaleet tähän...").fill("x");
  const before = await content("bio");
  await page.getByRole("button", { name: "Lisää teatterikrediitti" }).click();
  const trash = page.locator("button:has(svg.lucide-trash2), button:has(svg.lucide-trash-2)");
  await trash.last().click();
  await page.getByRole("button", { name: /Kyllä|Poista/ }).last().click().catch(() => {});
  await page.waitForTimeout(2000);
  record(info, "toasts", await page.locator("li[role='status']").allInnerTexts());
  record(info, "saved", (await content("bio")).updated_at !== before.updated_at);
});

spec({ id: "B41", title: "CV upload failure → toast, bio unchanged; normal path overwrites (owner NULL)", tier: "gate", ...D }, async ({ page }) => {
  const before = await content("bio");
  await page.route(/\/storage\/v1\/object\/documents\//, (r) => (r.request().method() !== "GET" ? r.fulfill({ status: 500, contentType: "application/json", body: '{"message":"e2e"}' }) : r.continue()));
  await openAdminTab(page, "Bio");
  await page.locator('input[type="file"][accept=".pdf"]').setInputFiles({ name: `${TAG}.pdf`, mimeType: "application/pdf", buffer: tinyPdf("fail") });
  await page.getByRole("button", { name: "Tallenna muutokset" }).last().click();
  await expect(page.getByText(/Virhe/).first()).toBeVisible({ timeout: 20_000 });
  expect((await content("bio")).updated_at).toBe(before.updated_at);
  await page.unroute(/\/storage\/v1\/object\/documents\//);
  await page.locator('input[type="file"][accept=".pdf"]').setInputFiles({ name: `${TAG}.pdf`, mimeType: "application/pdf", buffer: tinyPdf("ok") });
  await saveBio(page);
  const r = await fetch(String(before.content.cvUrl), { headers: { Range: "bytes=0-0" }, cache: "no-store" });
  expect([200, 206]).toContain(r.status);
});

spec({ id: "B42", title: "home hero: choose file + alt → home hero updates", tier: "known", ...D, extraTags: ["@FX5"] }, async ({ page }) => {
  trackUploads(page);
  await openAdminTab(page, "Kuvat");
  const home = page.locator("div").filter({ has: page.getByText("Etusivun pääkuva", { exact: true }) }).filter({ has: page.locator('input[type="file"]') }).last();
  await home.locator('input[type="file"]').setInputFiles({ name: `${TAG}-home.jpg`, mimeType: "image/jpeg", buffer: await makeImage(page, 1200, 1200) });
  await home.getByPlaceholder("Kuvaile kuvaa").fill(`${TAG} home hero`);
  await home.getByRole("button", { name: /Päivitä/ }).click();
  await expect.poll(async () => ((await content("page_images")).content.home_hero as { alt: string }).alt, { timeout: 60_000 }).toBe(`${TAG} home hero`);
  const src = ((await content("page_images")).content.home_hero as { src: string }).src;
  await gotoSettled(page, "/");
  await expect(page.locator(`img[src="${src}"]`).first()).toBeAttached();
});

spec({ id: "B43", title: "dual uploader formats and pending state (record)", tier: "regression", ...D }, async ({ page }, info) => {
  await openAdminTab(page, "Kuvat");
  const bio = page.locator("div").filter({ has: page.getByText("Bio-sivun pääkuva", { exact: true }) }).filter({ has: page.locator('input[type="file"]') }).last();
  const accept = await bio.locator('input[type="file"]').first().getAttribute("accept");
  record(info, "accept", accept);
  expect(accept).not.toMatch(/gif|heic/i);
  // Both files are required by the dual uploader.
  await bio.locator('input[type="file"]').nth(0).setInputFiles({ name: `${TAG}-slow-d.jpg`, mimeType: "image/jpeg", buffer: await makeImage(page, 1000, 600) });
  await bio.locator('input[type="file"]').nth(1).setInputFiles({ name: `${TAG}-slow-m.jpg`, mimeType: "image/jpeg", buffer: await makeImage(page, 600, 1000) });
  await bio.getByPlaceholder("Kuvaile desktop-kuvaa").fill(`${TAG} desktop 2`);
  await bio.getByPlaceholder("Kuvaile mobiilikuvaa").fill(`${TAG} mobile 2`);
  for (const f of await bio.getByPlaceholder("Valokuvaajan nimi").all()) await f.fill(`${TAG} kuvaaja`);
  await page.route(/\/storage\/v1\/object\/images\//, async (r) => { await new Promise((x) => setTimeout(x, 2500)); await r.continue(); });
  const btn = bio.getByRole("button", { name: /Päivitä|Päivitetään/ });
  await btn.click();
  await expect(bio.getByRole("button", { name: /Päivitetään/ })).toBeDisabled();
  await page.waitForTimeout(4000);
});

spec({ id: "B44", title: "concurrent edits: last save wins (record, FU4)", tier: "record", ...D }, async ({ page }, info) => {
  const p2 = await page.context().newPage();
  await openAdminTab(page, "Laulunopetus");
  await openAdminTab(p2, "Laulunopetus");
  await page.getByPlaceholder("Tagline...").fill(`${TAG} tab A`);
  await page.getByRole("button", { name: "Tallenna muutokset" }).last().click();
  await page.waitForTimeout(2000);
  await p2.getByPlaceholder("Painikkeen teksti...").first().fill(`${TAG} tab B`);
  await p2.getByRole("button", { name: "Tallenna muutokset" }).last().click();
  await p2.waitForTimeout(2000);
  const c = (await content("laulunopetus")).content;
  record(info, "after both saves", { tagline: c.tagline, cta: c.ctaButtonText });
  await p2.close();
});

spec({ id: "B45", title: "laulunopetus: delete the last tier while visible (record, FU7)", tier: "record", ...D }, async ({ page }, info) => {
  await openAdminTab(page, "Laulunopetus");
  const before = await content("laulunopetus");
  const sw = page.getByLabel("Näytä hinnasto sivulla");
  if ((await sw.getAttribute("data-state")) !== "checked") await sw.click();
  const trash = page.locator("button:has(svg.lucide-trash2), button:has(svg.lucide-trash-2)");
  record(info, "trash buttons", await trash.count());
  await page.getByRole("button", { name: "Tallenna muutokset" }).last().click();
  await page.waitForTimeout(2500);
  record(info, "saved", (await content("laulunopetus")).updated_at !== before.updated_at);
  record(info, "visible errors", await page.locator("[id$='-form-item-message']").allInnerTexts());
});

spec({ id: "B46", title: "free-text price in the Service JSON-LD (record, FU10)", tier: "record", ...D }, async ({ page }, info) => {
  const c = (await content("laulunopetus")).content as { pricingTiers?: { price: string }[] };
  record(info, "prices in DB", (c.pricingTiers || []).map((t) => t.price));
  await gotoSettled(page, "/laulunopetus");
  const service = (await jsonLd(page)).find((j) => (j as { "@type"?: string })["@type"] === "Service");
  record(info, "Service JSON-LD", service);
  test.info().annotations.push({ type: "note", description: "compare offers.price with the free-text price (e.g. 'alk. 40 €')" });
});
