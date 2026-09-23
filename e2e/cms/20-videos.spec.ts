// Video CMS (L, new DB): B8, B32, B33, B34. Test videos use fake 11-char ids starting "E2E" so the
// B15 sweep can find them (music videos have no title). Real rows' order_index may be rewritten
// by reordering (data class D) — the X2 re-import restores them.
import type { Page } from "@playwright/test";
import { spec, expect, record } from "../support/fixtures";
import { NEW_REF, RUN_ID } from "../support/env";
import { test } from "../support/fixtures";
import { openAdminTab } from "../support/cms";
import { anonGet, ledgerAdd } from "../support/rest";
import { gotoSettled } from "../support/site";

type Video = { id: string; url: string; section: string; order_index: number; is_featured: boolean; title: string | null };
// 11-char fake YouTube ids, unique per test run attempt: "E2E" + 6 time chars + 2 digits.
const STAMP = Date.now().toString(36).slice(-6);
const vid = (n: number) => `E2E${STAMP}${String(n).padStart(2, "0")}`;
const videos = () => anonGet<Video>(NEW_REF, "videos?select=*&order=section.asc,order_index.asc");

/** dnd-kit measures between key events; give it a beat. */
async function sortKey(page: Page, key: string) {
  await page.keyboard.press(key);
  await page.waitForTimeout(300);
}

function card(page: Page, section: "Musavideot" | "Muut videot") {
  return page.locator("div.rounded-lg, div[class*='card']").filter({ has: page.getByText(section, { exact: true }) }).filter({ has: page.getByRole("button", { name: "Lisää uusi video" }) }).last();
}

async function addVideo(page: Page, section: "Musavideot" | "Muut videot", url: string, title?: string, description?: string) {
  await openAdminTab(page, "Videot");
  await card(page, section).getByRole("button", { name: "Lisää uusi video" }).click();
  const d = page.getByRole("dialog", { name: "Lisää uusi video" });
  await d.getByPlaceholder("https://www.youtube.com/watch?v=...").fill(url);
  if (title !== undefined) await d.getByPlaceholder("Videon otsikko").fill(title);
  if (description !== undefined) await d.getByPlaceholder("Videon kuvaus").fill(description);
  // Submit with Enter: the live YouTube preview keeps resizing, so the button never counts as "stable".
  await (title !== undefined ? d.getByPlaceholder("Videon otsikko") : d.getByPlaceholder("https://www.youtube.com/watch?v=...")).press("Enter");
  await expect(d).toBeHidden({ timeout: 20_000 });
  const row = (await videos()).find((v) => v.url === url)!;
  expect(row, `inserted ${url}`).toBeTruthy();
  ledgerAdd("videos", row.id);
  ledgerAdd("rows", `videos:${row.id}`);
  return row;
}

async function deleteVideo(page: Page, url: string) {
  const count = async () => (await videos()).filter((v) => v.url === url).length;
  const n = await count();
  await openAdminTab(page, "Videot");
  const item = page.locator("div.relative").filter({ hasText: url }).last();
  await item.getByRole("button", { name: "Poista" }).click();
  await page.getByRole("button", { name: "Kyllä, poista" }).click();
  await expect.poll(count).toBe(n - 1);
}

spec({ id: "B8", title: "videos: add per section, embeds, keyboard reorder persists, delete", tier: "gate", env: ["L"], cmsWrite: true, data: "mutates-real" }, async ({ page }) => {
  const music = `https://youtu.be/${vid(1)}`;
  const other = `https://youtu.be/${vid(2)}`;
  const featuredBefore = (await videos()).filter((v) => v.is_featured).map((v) => v.id);
  await addVideo(page, "Musavideot", music);
  await addVideo(page, "Muut videot", other, `E2E-TESTI-${RUN_ID} video`, "E2E kuvaus");
  await gotoSettled(page, "/galleria");
  await expect(page.locator(`iframe[src="https://www.youtube.com/embed/${vid(1)}"]`)).toHaveCount(1);
  await expect(page.locator(`iframe[src="https://www.youtube.com/embed/${vid(2)}"]`)).toHaveCount(1);
  // Keyboard reorder: move the new music video up one place.
  await openAdminTab(page, "Videot");
  const before = (await videos()).filter((v) => v.section === "Musavideot");
  const mine = before.find((v) => v.url === music)!;
  const handle = page.locator("div.relative").filter({ hasText: music }).last().locator('[title="Vedä järjestääksesi"]');
  await handle.focus();
  await sortKey(page, "Space");
  await sortKey(page, "ArrowUp");
  await sortKey(page, "Space");
  await expect.poll(async () => (await videos()).find((v) => v.id === mine.id)!.order_index, { timeout: 15_000 }).toBe(mine.order_index - 1);
  await page.reload();
  await openAdminTab(page, "Videot");
  await expect(page.getByText(music, { exact: true })).toBeVisible();
  const musicUrls = new Set(before.map((v) => v.url));
  const texts = (await page.locator("p.break-all").allInnerTexts()).filter((t) => musicUrls.has(t));
  expect(texts.indexOf(music)).toBe(before.findIndex((v) => v.id === mine.id) - 1);
  await deleteVideo(page, music);
  await deleteVideo(page, other);
  expect((await videos()).filter((v) => v.is_featured).map((v) => v.id)).toEqual(featuredBefore);
});

spec({ id: "B33", title: "video URL formats and required fields", tier: "regression", env: ["L"], cmsWrite: true, data: "test-rows" }, async ({ page }, info) => {
  test.setTimeout(300_000);
  // Muut videot: title + description required (the dialog stays open).
  await openAdminTab(page, "Videot");
  await card(page, "Muut videot").getByRole("button", { name: "Lisää uusi video" }).click();
  const d = page.getByRole("dialog", { name: "Lisää uusi video" });
  await d.getByPlaceholder("https://www.youtube.com/watch?v=...").fill(`https://youtu.be/${vid(3)}`);
  await d.getByPlaceholder("https://www.youtube.com/watch?v=...").press("Enter");
  await expect(d).toBeVisible();
  await page.keyboard.press("Escape");
  const ok = [`https://youtu.be/${vid(4)}?si=abc`, `https://www.youtube.com/watch?v=${vid(5)}&t=42`, `https://m.youtube.com/watch?v=${vid(6)}`];
  const rec: Record<string, string | null> = {};
  for (const u of ok) await addVideo(page, "Musavideot", u);
  await gotoSettled(page, "/galleria");
  for (const u of ok) {
    const id = u.match(/E2E[\w-]{8}/)![0];
    await expect(page.locator(`iframe[src="https://www.youtube.com/embed/${id}"]`), u).toHaveCount(1);
  }
  for (const u of [`https://www.youtube.com/shorts/${vid(7)}`, `https://www.youtube.com/watch?feature=shared&v=${vid(8)}`, "abc"]) {
    try {
      await addVideo(page, "Musavideot", u);
      await gotoSettled(page, "/galleria");
      const id = u.match(/E2E[\w-]{8}/)?.[0];
      const embeds = id ? page.locator(`iframe[src*="${id}"]`) : page.locator("iframe[src$='/embed/abc']");
      rec[u] = `saved; embed: ${(await embeds.count()) ? await embeds.first().getAttribute("src") : "none"}`;
    } catch (e) {
      rec[u] = `not saved: ${(e as Error).message.slice(0, 60)}`;
      await page.keyboard.press("Escape");
    }
  }
  record(info, "follow-up formats (FU6)", rec);
  // Only this attempt's rows; anything older is swept by B15.
  const mine = (await videos()).filter((x) => x.url.includes(STAMP));
  for (const v of mine) await deleteVideo(page, v.url);
  if ((await videos()).some((x) => x.url === "abc")) await deleteVideo(page, "abc");
});

spec({ id: "B34", title: "order after delete and add: 0..k-1, real videos keep their relative order", tier: "regression", env: ["L"], cmsWrite: true, data: "mutates-real" }, async ({ page }) => {
  const realBefore = (await videos()).filter((v) => !/E2E/.test(v.url));
  const a = await addVideo(page, "Musavideot", `https://youtu.be/${vid(9)}`);
  await deleteVideo(page, a.url);
  await addVideo(page, "Musavideot", `https://youtu.be/${vid(10)}`);
  for (const section of ["Musavideot", "Muut videot"]) {
    const idx = (await videos()).filter((v) => v.section === section).map((v) => v.order_index).sort((x, y) => x - y);
    expect(idx, section).toEqual(idx.map((_, i) => i));
  }
  const realAfter = (await videos()).filter((v) => !/E2E/.test(v.url));
  for (const section of ["Musavideot", "Muut videot"]) {
    expect(realAfter.filter((v) => v.section === section).map((v) => v.id), section).toEqual(realBefore.filter((v) => v.section === section).map((v) => v.id));
  }
  await deleteVideo(page, `https://youtu.be/${vid(10)}`);
});

spec({ id: "B32", title: "featured video: adding a new featured one (record, FU1)", tier: "record", env: ["L"], cmsWrite: true, data: "mutates-real" }, async ({ page }, info) => {
  await openAdminTab(page, "Videot");
  await card(page, "Musavideot").getByRole("button", { name: "Lisää uusi video" }).click();
  const d = page.getByRole("dialog", { name: "Lisää uusi video" });
  const url = `https://youtu.be/${vid(11)}`;
  await d.getByPlaceholder("https://www.youtube.com/watch?v=...").fill(url);
  await d.getByLabel("Aseta esittelyssä olevaksi").check();
  await d.getByPlaceholder("https://www.youtube.com/watch?v=...").press("Enter");
  await expect(d).toBeHidden({ timeout: 20_000 });
  const all = await videos();
  const mine = all.find((v) => v.url === url);
  if (mine) { ledgerAdd("videos", mine.id); ledgerAdd("rows", `videos:${mine.id}`); }
  record(info, "featured count after adding a featured video", all.filter((v) => v.is_featured).length);
  await deleteVideo(page, url);
});
