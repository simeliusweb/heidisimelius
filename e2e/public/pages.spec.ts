// A4–A9, A29, A31: page-level behaviour driven by the DB.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spec, expect, record, test } from "../support/fixtures";
import { STATE, T0 } from "../support/env";
import { gotoSettled, expandAll, countInSections, cardOf, loadAllImages } from "../support/site";
import { anonGet, storageKey, upcomingAt } from "../support/rest";

type Gig = { id: string; title: string; gig_type: string; performance_date: string; event_page_url: string | null; tickets_url: string | null; gig_group_id: string | null };

/** sha256 per "<bucket>/<path>" from the source mirror (= what BL1 serves). */
function mirrorSha(key: string): string | undefined {
  const f = path.join(STATE, "exports/storage-mirror/manifest.json");
  if (!fs.existsSync(f)) return undefined;
  return (JSON.parse(fs.readFileSync(f, "utf8")) as Record<string, { sha256: string }>)[key]?.sha256;
}

spec({ id: "A4", title: "keikat order, grouping, show-more and links", tier: "regression", env: ["L"], data: "read" }, async ({ page, run }) => {
  const up = await upcomingAt(run.targetRef, T0);
  await gotoSettled(page, "/keikat");
  // Upcoming groups in ascending order of their first performance, per section.
  for (const [section, type] of [["Musiikkikeikat", "Musiikki"], ["Teatteriesitykset", "Teatteri"]] as const) {
    const want = up.groups.filter((g) => g[0].gig_type === type).map((g) => g[0].title);
    const got = await page.evaluate((s) => {
      const h = [...document.querySelectorAll("h2")].find((x) => x.textContent?.trim() === s);
      return [...(h?.closest("section")?.querySelectorAll("h2") || [])].map((x) => x.textContent?.trim()).filter((t) => t !== s);
    }, section);
    expect(got, section).toEqual(want);
  }
  // A multi-date group lists every performance ("klo" rows), expanding when needed.
  const biggest = up.groups.reduce((a, b) => (b.length > a.length ? b : a), []);
  if (biggest.length > 1) {
    const card = cardOf(page, biggest[0].title);
    await expandAll(page);
    await expect(card.getByText(/^klo \d{2}:\d{2}$/)).toHaveCount(biggest.length);
  }
  // Past gigs: newest first; "Näytä lisää" reveals all.
  const past = await anonGet<Gig>(run.targetRef, `gigs?select=title,performance_date&performance_date=lt.${encodeURIComponent(T0)}&order=performance_date.desc`);
  await expandAll(page);
  const pastTitles = await page.evaluate(() => {
    const h = [...document.querySelectorAll("h2")].find((x) => x.textContent?.trim() === "Menneet keikat");
    return [...(h?.closest("section")?.querySelectorAll("h3") || [])].map((x) => x.textContent?.trim());
  });
  expect(pastTitles).toEqual(past.map((p) => p.title));
  await expect(page.getByText("Tässä kaikki!")).toBeVisible();
  // Ticket / event links: _blank and equal to the DB.
  const rows = await anonGet<Gig>(run.targetRef, `gigs?select=*&performance_date=gte.${encodeURIComponent(T0)}`);
  const links = await page.locator('a:has-text("Liput"), a:has-text("Tapahtuman sivulle")').evaluateAll((as) => as.map((a) => ({ href: a.getAttribute("href"), target: a.getAttribute("target"), text: a.textContent?.trim() })));
  for (const l of links) {
    expect(l.target).toBe("_blank");
    const col = l.text?.startsWith("Liput") ? "tickets_url" : "event_page_url";
    expect(rows.map((r) => r[col]), `${l.text} ${l.href}`).toContain(l.href);
  }
});

spec({ id: "A5", title: "home gig cards scroll to their /keikat card; embeds present", tier: "known", env: ["L"], data: "read", extraTags: ["@FX6"] }, async ({ page }, info) => {
  await gotoSettled(page, "/");
  const cards = page.locator('a[href^="/keikat#"]');
  const n = await cards.count();
  for (let i = 0; i < n; i++) {
    await gotoSettled(page, "/");
    const href = (await cards.nth(i).getAttribute("href"))!;
    const id = decodeURIComponent(href.split("#")[1]);
    await cards.nth(i).click();
    await page.waitForURL(/\/keikat/);
    const target = page.locator(`[id="${id}"]`);
    await expect(target, `anchor ${id}`).toHaveCount(1);
    await expect(target).toBeInViewport({ ratio: 0.1, timeout: 15_000 });
  }
  await gotoSettled(page, "/");
  // Third-party embeds: soft (recorded, not asserted beyond presence).
  record(info, "embeds", {
    youtube: await page.locator('iframe[src*="youtube.com/embed"]').count(),
    spotify: await page.locator('iframe[src*="open.spotify.com"]').count(),
    lightwidget: await page.locator('iframe[src*="lightwidget.com"]').count(),
  });
  await expect(page.locator('iframe[src*="open.spotify.com"]')).toHaveCount(1);
  await expect(page.locator('iframe[src*="lightwidget.com"]')).toHaveCount(1);
});

spec({ id: "A6", title: "galleria masonry, show-more, lightbox, press kit and zip", tier: "gate", env: ["L"], data: "read", mobile: true }, async ({ page, run }, info) => {
  test.setTimeout(180_000);
  const sets = await anonGet<{ is_press_kit: boolean; photos: { src: string }[]; press_kit_zip_url: string | null; title: string; order_index: number }>(
    run.targetRef,
    "photo_sets?select=*&order=order_index.asc,id.asc",
  );
  const pressKit = sets.find((s) => s.is_press_kit);
  const galleries = sets.filter((s) => !s.is_press_kit);
  await gotoSettled(page, "/galleria");
  expect(await countInSections(page, ["Kuvagalleria"], "h3")).toBe(galleries.length);
  // Masonry column count follows the viewport (2 below sm, 3 below lg, 4 above).
  const cols = await page.locator(".react-photo-album--column").evaluateAll((cs) => new Set(cs.map((c) => c.parentElement)).size && cs.length);
  record(info, "masonry columns (all albums)", cols);
  await expandAll(page);
  const galleryImgs = await page.evaluate(() => {
    const h = [...document.querySelectorAll("h2")].find((x) => x.textContent?.trim() === "Kuvagalleria");
    return [...(h?.closest("section")?.querySelectorAll("img") || [])].map((i) => i.getAttribute("src"));
  });
  expect(galleryImgs.length).toBe(galleries.reduce((a, g) => a + g.photos.length, 0));
  // Lightbox: open, next, prev, Esc; slides come from the target ref.
  const first = page.locator(".react-photo-album--photo").first();
  await first.click();
  const slide = page.locator(".yarl__slide_current img").first();
  await expect(slide).toBeVisible();
  const src1 = await slide.getAttribute("src");
  expect(src1).toContain(`${run.targetRef}.supabase.co`);
  await page.keyboard.press("ArrowRight");
  await expect.poll(async () => page.locator(".yarl__slide_current img").first().getAttribute("src")).not.toBe(src1);
  await page.keyboard.press("ArrowLeft");
  await expect.poll(async () => page.locator(".yarl__slide_current img").first().getAttribute("src")).toBe(src1);
  await page.keyboard.press("Escape");
  await expect(page.locator(".yarl__root")).toHaveCount(0);
  // Press kit: its photos, and the zip is byte-identical to the source.
  if (pressKit) {
    const sec = page.locator("section").filter({ has: page.getByRole("heading", { name: "Pressikuvat" }) }).first();
    await expect(sec.getByRole("link", { name: /Lataa kuva/ })).toHaveCount(pressKit.photos.length);
    if (pressKit.press_kit_zip_url) {
      const href = await page.getByRole("link", { name: /Lataa kaikki pressikuvat/ }).getAttribute("href");
      expect(href).toBe(pressKit.press_kit_zip_url);
      const r = await fetch(href!);
      expect(r.status).toBe(200);
      expect(r.headers.get("content-type")).toBe("application/zip");
      const sha = crypto.createHash("sha256").update(Buffer.from(await r.arrayBuffer())).digest("hex");
      const want = mirrorSha(storageKey(href!)!);
      if (want) expect(sha, "zip sha256 = source").toBe(want);
      else record(info, "zip sha256", sha);
    }
  }
});

spec({ id: "A7", title: "bio credits, featured video, images and CV", tier: "gate", env: ["L"], data: "read" }, async ({ page, run }, info) => {
  const [bio] = await anonGet<{ content: Record<string, unknown> }>(run.targetRef, "page_content?select=content&page_name=eq.bio");
  const c = bio.content as { featuredVideoUrl?: string; cvUrl?: string; theatreCredits?: { year: number; title: string }[]; bioImage1?: { src: string }; bioImage2?: { src: string }; bioImage3?: { src: string } };
  await gotoSettled(page, "/bio");
  if (c.featuredVideoUrl) await expect(page.locator(`iframe[src="${c.featuredVideoUrl}"]`)).toHaveCount(1);
  // Each bio image is rendered twice (desktop + mobile layouts); one copy is hidden per viewport.
  await loadAllImages(page);
  for (const img of [c.bioImage1, c.bioImage2, c.bioImage3].filter(Boolean)) {
    const widths = await page.locator(`img[src="${img!.src}"]`).evaluateAll((is) => is.map((i) => (i as HTMLImageElement).naturalWidth));
    expect(widths.length, img!.src).toBeGreaterThan(0);
    expect(Math.max(...widths), img!.src).toBeGreaterThan(0);
  }
  // Credits are shown newest year first.
  if (c.theatreCredits?.length) {
    const years = await page.evaluate(() => [...document.querySelectorAll("main *")].map((e) => e.childElementCount === 0 ? e.textContent?.trim() : "").filter((t) => /^(19|20)\d{2}$/.test(t || "")).map(Number));
    record(info, "years in page order", years.slice(0, 20));
    const firstBlock = years.slice(0, new Set(c.theatreCredits.map((x) => x.year)).size);
    expect([...firstBlock].sort((a, b) => b - a)).toEqual(firstBlock);
  }
  if (c.cvUrl) {
    const href = await page.getByRole("link", { name: /Lataa CV/ }).getAttribute("href");
    expect(href).toBe(c.cvUrl);
    expect(href).toContain(`${run.targetRef}.supabase.co`);
    const r = await fetch(href!);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("application/pdf");
    const sha = crypto.createHash("sha256").update(Buffer.from(await r.arrayBuffer())).digest("hex");
    const want = mirrorSha(storageKey(href!)!);
    if (want) expect(sha, "CV = source").toBe(want);
  }
});

spec({ id: "A8", title: "laulunopetus content, booking CTA, pricing visibility", tier: "regression", env: ["L"], data: "read" }, async ({ page, run }) => {
  const [row] = await anonGet<{ content: Record<string, unknown> }>(run.targetRef, "page_content?select=content&page_name=eq.laulunopetus");
  const c = row.content as { tagline: string; ctaButtonUrl?: string; pricingVisible?: boolean; pricingTitle: string; schoolInfoTitle?: string };
  await gotoSettled(page, "/laulunopetus");
  await expect(page.getByText(c.tagline, { exact: false }).first()).toBeVisible();
  if (c.ctaButtonUrl) {
    const hrefs = await page.locator(`a[href="${c.ctaButtonUrl}"]`).count();
    expect(hrefs).toBeGreaterThan(0);
    expect(c.ctaButtonUrl).toContain("employee_id=1449");
  }
  const pricingHeading = page.getByRole("heading", { name: c.pricingTitle, exact: true });
  await expect(pricingHeading).toHaveCount(c.pricingVisible === false ? 0 : 1);
  if (c.schoolInfoTitle) await expect(page.getByRole("heading", { name: c.schoolInfoTitle })).toHaveCount(1);
});

spec({ id: "A9", title: "bilebandi hero, video, booking form, mailto, no footer", tier: "regression", env: ["L"], data: "read" }, async ({ page }) => {
  await gotoSettled(page, "/bilebandi-heidi-and-the-hot-stuff");
  await expect(page.locator('iframe[src*="youtube.com/embed/1IYiuMruQic"]')).toHaveCount(1);
  await expect(page.locator('a[href="mailto:heidiandthehotstuff@gmail.com"]').first()).toBeVisible();
  await expect(page.getByPlaceholder("Puhelinnumero")).toBeVisible();
  // The site footer (with the contact form) is replaced by the band's own footer here.
  await expect(page.getByPlaceholder("Kirjoita aihe...")).toHaveCount(0);
  await expect(page.locator("h1")).toHaveCount(1);
});

spec({ id: "A29", title: "download behaviour: Lataa kuva, zip, CV", tier: "regression", env: ["L"], data: "read" }, async ({ page, run }, info) => {
  const out: Record<string, unknown> = {};
  await gotoSettled(page, "/galleria");
  const links = [
    ...(await page.getByRole("link", { name: /Lataa kuva/ }).evaluateAll((as) => as.slice(0, 1).map((a) => (a as HTMLAnchorElement).href))),
    ...(await page.getByRole("link", { name: /Lataa kaikki pressikuvat/ }).evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href))),
  ];
  await gotoSettled(page, "/bio");
  links.push(...(await page.getByRole("link", { name: /Lataa CV/ }).evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href))));
  for (const href of links) {
    const r = await fetch(href, { headers: { Range: "bytes=0-0" } });
    out[href.split("/").slice(-2).join("/")] = {
      status: r.status,
      type: r.headers.get("content-type"),
      disposition: r.headers.get("content-disposition"),
      crossOrigin: !href.startsWith(new URL(page.url()).origin),
    };
    expect([200, 206]).toContain(r.status);
    expect(href).toContain(`${run.targetRef}.supabase.co`);
  }
  // Cross-origin `download` attributes are ignored by browsers (FU22): record navigate vs download.
  record(info, "downloads", out);
});

spec({ id: "A31", title: "paragraph blocks render one <p> each", tier: "known", env: ["L"], data: "read", extraTags: ["@FX7"] }, async ({ page, run }) => {
  const rows = await anonGet<{ page_name: string; content: Record<string, string> }>(run.targetRef, "page_content?select=page_name,content&page_name=in.(bio,laulunopetus)");
  const bio = rows.find((r) => r.page_name === "bio")!.content;
  const lau = rows.find((r) => r.page_name === "laulunopetus")!.content;
  await gotoSettled(page, "/bio");
  const ps = await page.locator("p").allInnerTexts();
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  const bioBlocks = bio.introParagraphs.split(/(?:\r?\n|\\n)+/).map(norm).filter(Boolean);
  for (const b of bioBlocks) expect(ps.map(norm), `bio intro block "${b.slice(0, 40)}…"`).toContain(b);
  await gotoSettled(page, "/laulunopetus");
  const lps = (await page.locator("p").allInnerTexts()).map(norm);
  for (const b of lau.introBodyParagraphs.split("\n\n").map(norm).filter(Boolean)) expect(lps, `laulunopetus block "${b.slice(0, 40)}…"`).toContain(b);
});
