// Gallery / press kit CMS (L, new DB): B9, B10, B35, B36, B37, B38.
import type { Page } from "@playwright/test";
import { spec, expect, record, test } from "../support/fixtures";
import { NEW_REF, secrets } from "../support/env";
import { TAG, makeImage, openAdminTab, recordRows, trackUploads } from "../support/cms";
import { anonGet, ledgerAdd, serviceRest } from "../support/rest";
import { gotoSettled, expandAll } from "../support/site";

type Set = { id: string; title: string; is_press_kit: boolean; order_index: number; photos: { src: string; alt: string }[]; press_kit_zip_url: string | null };
/** A title unique to this attempt, so a retry never trips over rows from an earlier one. */
const uniq = (id: string) => `${TAG}-${id}-${Date.now().toString(36).slice(-5)}`;
const sets = () => anonGet<Set>(NEW_REF, "photo_sets?select=*&order=is_press_kit.desc,order_index.asc,id.asc");

async function addGallery(page: Page, title: string, n = 2, alts = true) {
  trackUploads(page);
  await openAdminTab(page, "Galleria");
  await page.getByRole("button", { name: "Lisää uusi galleria" }).click();
  const d = page.getByRole("dialog", { name: "Lisää uusi kuvagalleria" });
  await d.getByPlaceholder("Otsikko").fill(title);
  await d.getByPlaceholder("Valokuvaajan nimi").first().fill(`${TAG} kuvaaja`);
  const files = [];
  for (let i = 0; i < n; i++) files.push({ name: `${TAG}-${i}.jpg`, mimeType: "image/jpeg", buffer: await makeImage(page, 600 + i * 100, 400, "image/jpeg", `${TAG} ${i}`) });
  if (n) await d.locator('input[type="file"]').first().setInputFiles(files);
  if (alts) for (let i = 0; i < n; i++) await d.getByPlaceholder("Kuvaile kuvaa alt-tekstillä...").nth(i).fill(`${TAG} alt ${i}`);
  await expect(d.getByText("Lasketaan kuvien kokoja...")).toHaveCount(0);
  await d.getByRole("button", { name: "Tallenna", exact: true }).click();
  return d;
}

/** dnd-kit measures between key events; give it a beat. */
async function sortKey(page: Page, key: string) {
  await page.keyboard.press(key);
  await page.waitForTimeout(300);
}

function setCard(page: Page, title: string) {
  return page.locator("div.relative").filter({ has: page.getByRole("heading", { level: 3, name: title, exact: true }) }).last();
}

async function deleteSet(page: Page, title: string) {
  await openAdminTab(page, "Galleria");
  await setCard(page, title).getByRole("button", { name: "Poista" }).click();
  await page.getByRole("button", { name: "Kyllä, poista" }).click();
  await expect.poll(async () => (await sets()).some((s) => s.title === title)).toBe(false);
}

spec({ id: "B9", title: "photo set: create with 2 uploads, reorder photos and sets, edit, delete", tier: "gate", env: ["L"], cmsWrite: true, data: "mutates-real" }, async ({ page }) => {
  test.setTimeout(240_000);
  const title = uniq("B9");
  const d = await addGallery(page, title, 2);
  await expect(d).toBeHidden({ timeout: 60_000 });
  const mine = (await sets()).find((s) => s.title === title)!;
  await recordRows("photo_sets", [mine.id]);
  expect(mine.photos.length).toBe(2);
  expect(mine.photos.every((p) => p.src.includes(`${NEW_REF}.supabase.co/storage/v1/object/public/photo_sets_images/`))).toBe(true);
  await gotoSettled(page, "/galleria");
  await expect(page.getByRole("heading", { level: 3, name: title, exact: true })).toBeVisible();
  // Reorder photos inside the set (keyboard on the photo handle) and save.
  await openAdminTab(page, "Galleria");
  await setCard(page, title).getByRole("button", { name: "Muokkaa" }).click();
  const e = page.getByRole("dialog", { name: /Muokkaa/ });
  const handles = e.locator('[title="Vedä järjestääksesi"]');
  await handles.nth(1).focus();
  await sortKey(page, "Space");
  await sortKey(page, "ArrowUp");
  await sortKey(page, "Space");
  await e.getByPlaceholder("Otsikko").fill(`${title}-muokattu`);
  await e.getByRole("button", { name: "Päivitä" }).click();
  await expect(e).toBeHidden({ timeout: 30_000 });
  const edited = (await sets()).find((s) => s.id === mine.id)!;
  expect(edited.title).toBe(`${title}-muokattu`);
  expect(edited.photos.map((p) => p.src)).toEqual([mine.photos[1].src, mine.photos[0].src]);
  // Reorder sets: move ours up one (real ranks get rewritten; X2 restores them).
  const rankBefore = edited.order_index;
  await openAdminTab(page, "Galleria");
  await setCard(page, `${title}-muokattu`).locator('[title="Vedä järjestääksesi"]').first().focus();
  await sortKey(page, "Space");
  await sortKey(page, "ArrowUp");
  await sortKey(page, "Space");
  await expect.poll(async () => (await sets()).find((s) => s.id === mine.id)!.order_index, { timeout: 15_000 }).toBe(rankBefore - 1);
  await gotoSettled(page, "/galleria");
  const order = await page.evaluate(() => {
    const h = [...document.querySelectorAll("h2")].find((x) => x.textContent?.trim() === "Kuvagalleria");
    return [...(h?.closest("section")?.querySelectorAll("h3") || [])].map((x) => x.textContent?.trim());
  });
  const galleries = (await sets()).filter((s) => !s.is_press_kit).sort((a, b) => a.order_index - b.order_index).map((s) => s.title);
  expect(order).toEqual(galleries);
  await deleteSet(page, `${title}-muokattu`);
  await gotoSettled(page, "/galleria");
  await expect(page.getByRole("heading", { level: 3, name: new RegExp(title) })).toHaveCount(0);
});

spec({ id: "B10", title: "press kit zip replaced → new URL 200 (real zip kept)", tier: "gate", env: ["L"], cmsWrite: true, data: "mutates-real" }, async ({ page }) => {
  const uploads = trackUploads(page);
  const pk = (await sets()).find((s) => s.is_press_kit)!;
  test.skip(!pk, "no press kit");
  await openAdminTab(page, "Galleria");
  await page.locator("div").filter({ has: page.getByText("Press Kit", { exact: true }) }).getByRole("button", { name: "Muokkaa" }).first().click();
  const d = page.getByRole("dialog", { name: /Muokkaa/ });
  await d.locator('input[type="file"][accept=".zip"]').setInputFiles({ name: `${TAG}.zip`, mimeType: "application/zip", buffer: Buffer.from("PK\u0005\u0006" + "\0".repeat(18), "binary") });
  await d.getByRole("button", { name: "Päivitä" }).click();
  await expect(d).toBeHidden({ timeout: 30_000 });
  const after = (await sets()).find((s) => s.id === pk.id)!;
  expect(after.press_kit_zip_url).not.toBe(pk.press_kit_zip_url);
  const r = await fetch(after.press_kit_zip_url!, { headers: { Range: "bytes=0-0" } });
  expect([200, 206]).toContain(r.status);
  expect(uploads.some((u) => u.endsWith(".zip"))).toBe(true);
  // The original zip object must still exist.
  expect((await fetch(pk.press_kit_zip_url!, { headers: { Range: "bytes=0-0" } })).status).toBe(206);
});

spec({ id: "B35", title: "press-kit payload inserts (no 23502)", tier: "known", env: ["L"], cmsWrite: true, data: "test-rows", extraTags: ["@FX3"] }, async ({ page }, info) => {
  // Direct variant with the exact AddPhotoSetForm payload, as the test admin (claim-gated write).
  const tok = await (await fetch(`https://${NEW_REF}.supabase.co/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: secrets.NEW_PUB, "content-type": "application/json" }, body: JSON.stringify({ email: secrets.TEST_ADMIN_EMAIL, password: secrets.TEST_ADMIN_PASSWORD }) })).json();
  const count = (await sets()).filter((s) => s.is_press_kit).length;
  const payload = { title: "Press Kit", photographer_name: "Useita valokuvaajia", photographer_url: null, photos: [{ src: "/images/e2e.jpg", width: 1, height: 1, alt: TAG }], is_press_kit: true, press_kit_zip_url: null, order_index: count };
  const r = await fetch(`https://${NEW_REF}.supabase.co/rest/v1/photo_sets`, { method: "POST", headers: { apikey: secrets.NEW_PUB, Authorization: `Bearer ${tok.access_token}`, "content-type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(payload) });
  const body = await r.json();
  expect(r.status, JSON.stringify(body).slice(0, 200)).toBe(201);
  ledgerAdd("rows", `photo_sets:${body[0].id}`);
  await serviceRest("DELETE", `photo_sets?id=eq.${body[0].id}`);
  record(info, "UI variant", "only on a preview with the real press kit deleted (the Add button is disabled while one exists)");
  void page;
});

spec({ id: "B36", title: "gallery validation gaps (record, FU2)", tier: "record", env: ["L"], cmsWrite: true, data: "test-rows" }, async ({ page }, info) => {
  const out: Record<string, string> = {};
  const d = await addGallery(page, `${TAG}-B36-alts`, 1, false);
  await page.waitForTimeout(4000);
  out.emptyAlts = (await d.isVisible()) ? "blocked" : "saved";
  if (await d.isVisible()) await page.keyboard.press("Escape");
  const d2 = await addGallery(page, `${TAG}-B36-zero`, 0, false);
  await page.waitForTimeout(3000);
  out.zeroPhotos = (await d2.isVisible()) ? "blocked" : "saved";
  if (await d2.isVisible()) await page.keyboard.press("Escape");
  for (const s of (await sets()).filter((x) => x.title.startsWith(`${TAG}-B36`))) { ledgerAdd("rows", `photo_sets:${s.id}`); await deleteSet(page, s.title); }
  record(info, "observations", out);
});

spec({ id: "B37", title: "duplicate order_index after delete + add (record, FU3)", tier: "record", env: ["L"], cmsWrite: true, data: "test-rows" }, async ({ page }, info) => {
  test.setTimeout(240_000);
  const b37 = uniq("B37");
  for (const n of ["T1", "T2"]) await expect(await addGallery(page, `${b37}-${n}`, 1)).toBeHidden({ timeout: 60_000 });
  await deleteSet(page, `${b37}-T1`);
  await expect(await addGallery(page, `${b37}-T3`, 1)).toBeHidden({ timeout: 60_000 });
  const idx = (await sets()).filter((s) => !s.is_press_kit).map((s) => s.order_index);
  record(info, "order_index values", idx);
  record(info, "collision", idx.length !== new Set(idx).size);
  for (const s of (await sets()).filter((x) => x.title.startsWith(b37))) { ledgerAdd("rows", `photo_sets:${s.id}`); await deleteSet(page, s.title); }
});

spec({ id: "B38", title: "when photo edits are saved: cancel discards, Päivitä saves, removal shows", tier: "regression", env: ["L"], cmsWrite: true, data: "test-rows" }, async ({ page }) => {
  test.setTimeout(240_000);
  const title = uniq("B38");
  await expect(await addGallery(page, title, 2)).toBeHidden({ timeout: 60_000 });
  const mine = (await sets()).find((s) => s.title === title)!;
  await recordRows("photo_sets", [mine.id]);
  await openAdminTab(page, "Galleria");
  await setCard(page, title).getByRole("button", { name: "Muokkaa" }).click();
  let e = page.getByRole("dialog", { name: /Muokkaa/ });
  await e.locator('[title="Vedä järjestääksesi"]').nth(1).focus();
  await sortKey(page, "Space"); await sortKey(page, "ArrowUp"); await sortKey(page, "Space");
  await e.getByRole("button", { name: "Peruuta" }).click();
  expect((await sets()).find((s) => s.id === mine.id)!.photos).toEqual(mine.photos);
  await setCard(page, title).getByRole("button", { name: "Muokkaa" }).click();
  e = page.getByRole("dialog", { name: /Muokkaa/ });
  // Remove the first photo (its trash button) and save.
  await e.locator("button:has(svg.lucide-trash2), button:has(svg.lucide-trash-2)").first().click();
  await e.getByRole("button", { name: "Päivitä" }).click();
  await expect(e).toBeHidden({ timeout: 30_000 });
  const after = (await sets()).find((s) => s.id === mine.id)!;
  expect(after.photos.length).toBe(1);
  const removed = mine.photos.find((p) => !after.photos.some((a) => a.src === p.src))!;
  await gotoSettled(page, "/galleria");
  await expandAll(page);
  await expect(page.locator(`img[src="${removed.src}"]`)).toHaveCount(0);
  await expect(page.locator(`img[src="${after.photos[0].src}"]`)).toHaveCount(1);
  await deleteSet(page, title);
});
