// B23: every write and upload path shows its failure (403 42501 / 413 / 500) instead of "Onnistui!".
// All writes are answered in the browser; nothing reaches the database.
import type { Page, Route } from "@playwright/test";
import { spec, expect, record, test } from "../support/fixtures";
import { TAG, makeImage, openAdminTab } from "../support/cms";

const FAILURES = [
  { status: 403, body: { code: "42501", message: "permission denied for table" } },
  { status: 413, body: { message: "Payload too large" } },
  { status: 500, body: { message: "Internal error" } },
];

const WRITES = /\.supabase\.co\/(rest\/v1|storage\/v1\/object)\//;
let current: ((r: Route) => Promise<void>) | null = null;

/** Answer every write with the given failure; the suite's own guards (firewall, mail guard) stay in place. */
async function failWrites(page: Page, f: (typeof FAILURES)[number]) {
  if (current) await page.unroute(WRITES, current);
  current = (r: Route) =>
    ["GET", "HEAD", "OPTIONS"].includes(r.request().method()) || /\/storage\/v1\/object\/public\//.test(r.request().url())
      ? r.fallback()
      : r.fulfill({ status: f.status, contentType: "application/json", body: JSON.stringify(f.body) });
  await page.route(WRITES, current);
}

async function expectFailureShown(page: Page, where: string) {
  await expect(page.getByText(/Virhe|epäonnistui/).filter({ visible: true }).first(), `${where}: error toast`).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Onnistui!"), `${where}: no false success`).toHaveCount(0);
}

spec({ id: "B23", title: "write paths show errors (403/413/500)", tier: "known", env: ["L"], cmsWrite: true, data: "read", extraTags: ["@FX11", "@FX12"] }, async ({ page }, info) => {
  test.setTimeout(420_000);
  const seen: Record<string, string> = {};
  for (const f of FAILURES) {
    await failWrites(page, f);
    // Gig add (upload fails first)
    await openAdminTab(page, "Keikat");
    await page.getByRole("button", { name: "Lisää uusi keikka" }).click();
    let d = page.getByRole("dialog", { name: "Lisää uusi keikka" });
    await d.getByPlaceholder("Otsikko").fill(`${TAG}-B23`);
    await d.getByPlaceholder("Paikka").fill(`${TAG} paikka`);
    await d.getByPlaceholder("Kaupunki").fill("Tampere");
    await d.locator('input[type="file"]').setInputFiles({ name: "b23.jpg", mimeType: "image/jpeg", buffer: await makeImage(page, 200, 200) });
    await d.getByPlaceholder("Kuvan alt-teksti").fill(`${TAG} kuvaileva alt-teksti`);
    await d.getByPlaceholder("Kuvaus").fill(`${TAG} kuvaus virhetestiin`);
    await d.getByRole("button", { name: "Tallenna", exact: true }).click();
    await expectFailureShown(page, `gig add ${f.status}`);
    await expect(d, "dialog stays open").toBeVisible();
    await d.getByRole("button", { name: "Peruuta" }).click();
    await expect(d).toBeHidden();
    // Gig delete
    await page.getByRole("row").nth(1).getByRole("button", { name: "Avaa valikko" }).click();
    await page.getByRole("menuitem", { name: "Poista" }).click();
    await page.getByRole("button", { name: "Kyllä, poista" }).click();
    await expectFailureShown(page, `gig delete ${f.status}`);
    // Video add
    await openAdminTab(page, "Videot");
    await page.getByRole("button", { name: "Lisää uusi video" }).first().click();
    d = page.getByRole("dialog", { name: "Lisää uusi video" });
    await d.getByPlaceholder("https://www.youtube.com/watch?v=...").fill("https://youtu.be/E2EB23xxxxx");
    await d.getByPlaceholder("https://www.youtube.com/watch?v=...").press("Enter");
    await expectFailureShown(page, `video add ${f.status}`);
    await d.getByRole("button", { name: "Peruuta" }).click();
    // Page image (ImageManager)
    await openAdminTab(page, "Kuvat");
    const keikat = page.locator("div").filter({ has: page.getByText("Keikat-sivun pääkuva", { exact: true }) }).filter({ has: page.locator('input[type="file"]') }).last();
    await keikat.locator('input[type="file"]').setInputFiles({ name: "b23.jpg", mimeType: "image/jpeg", buffer: await makeImage(page, 300, 200) });
    await keikat.getByPlaceholder("Kuvaile kuvaa").fill(`${TAG} kuvaileva alt-teksti`);
    await keikat.getByPlaceholder("Valokuvaajan nimi").fill(`${TAG} kuvaaja`);
    await keikat.getByRole("button", { name: /Päivitä/ }).click();
    await expectFailureShown(page, `page image ${f.status}`);
    // Laulunopetus save
    await openAdminTab(page, "Laulunopetus");
    await page.getByRole("button", { name: "Tallenna muutokset" }).last().click();
    await expectFailureShown(page, `laulunopetus ${f.status}`);
    seen[String(f.status)] = (await page.locator("li[role='status']").allInnerTexts()).join(" | ").slice(0, 300);
    await page.reload();
  }
  record(info, "toasts", seen);
});
