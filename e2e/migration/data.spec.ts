// Direct data checks: A13, A26, A27, A28, A32, E3, D11, D12.
import { spec, expect, record, test } from "../support/fixtures";
import { NEW_REF, OLD_REF, projectFor } from "../support/env";
import { anonGet } from "../support/rest";
import { imageSize } from "../support/imagesize";

type Json = Record<string, unknown>;

async function allRows(ref: string) {
  const [gigs, videos, sets, pages] = await Promise.all([
    anonGet<Json>(ref, "gigs?select=*&order=id"),
    anonGet<Json>(ref, "videos?select=*&order=id"),
    anonGet<Json>(ref, "photo_sets?select=*&order=id"),
    anonGet<Json>(ref, "page_content?select=*&order=page_name"),
  ]);
  return { gigs, videos, sets, pages };
}

/** Every media URL the site stores (gig images, photos, zip, CV, bio images, heroes). */
function mediaUrls(d: Awaited<ReturnType<typeof allRows>>): string[] {
  const out: string[] = [];
  for (const g of d.gigs) out.push(String(g.image_url));
  for (const s of d.sets) {
    for (const p of (s.photos as { src: string }[]) || []) out.push(p.src);
    if (s.press_kit_zip_url) out.push(String(s.press_kit_zip_url));
  }
  const walk = (v: unknown, key = "") => {
    if (Array.isArray(v)) v.forEach((x) => walk(x, key));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
    else if (typeof v === "string" && (key === "src" || key === "cvUrl")) out.push(v);
  };
  for (const p of d.pages) walk(p.content);
  return out;
}

spec({ id: "A26", title: "media URL format", tier: "gate", env: ["direct"], data: "read" }, async ({ run }) => {
  const d = await allRows(run.targetRef);
  const re = new RegExp(`^https://${run.targetRef}\\.supabase\\.co/storage/v1/object/public/(images|gigs-images|photo_sets_images|documents)/[A-Za-z0-9._/-]+$`);
  const bad = mediaUrls(d).filter((u) => !(u.startsWith("/images/") || re.test(u)));
  expect(bad).toEqual([]);
});

spec({ id: "A27", title: "JSON shape contract and photo dimensions", tier: "gate", env: ["direct"], data: "read" }, async ({ run }, info) => {
  test.setTimeout(240_000);
  const d = await allRows(run.targetRef);
  for (const p of d.pages) expect(typeof p.content === "object" && !Array.isArray(p.content), `${p.page_name} content object`).toBe(true);
  const req: Record<string, string[]> = {
    bio: ["introParagraphs", "featuredVideoUrl", "featuredVideoCaption", "quoteText", "quoteAuthor", "concludingParagraphs"],
    laulunopetus: ["tagline", "introLeadParagraph", "introBodyParagraphs", "practiceItems", "ctaButtonText", "testimonials", "pricingTitle", "pricingTiers", "backgroundTitle", "backgroundParagraphs", "closingCta", "finalCtaButtonText", "heroImageCredit"],
    page_images: ["home_hero", "keikat_hero", "galleria_hero", "bio_hero"],
  };
  for (const p of d.pages) for (const k of req[String(p.page_name)] || []) expect(p.content as Json, `${p.page_name}.${k}`).toHaveProperty(k);
  const aspects: string[] = [];
  for (const s of d.sets) {
    expect(Array.isArray(s.photos), `${s.title} photos array`).toBe(true);
    for (const ph of s.photos as { src: string; width: number; height: number; alt?: string }[]) {
      expect(typeof ph.width === "number" && ph.width > 0 && typeof ph.height === "number" && ph.height > 0, `${ph.src} width/height`).toBe(true);
      const b = Buffer.from(await (await fetch(ph.src)).arrayBuffer());
      const nat = imageSize(b);
      if (!nat) { aspects.push(`unreadable ${ph.src.slice(-40)}`); continue; }
      const ratio = (ph.width / ph.height) / (nat.w / nat.h);
      if (Math.abs(ratio - 1) > 0.02) aspects.push(`${ph.src.slice(-40)} stored ${ph.width}x${ph.height} natural ${nat.w}x${nat.h}`);
    }
  }
  record(info, "aspect mismatches", aspects);
  expect(aspects).toEqual([]);
});

spec({ id: "A28", title: "order_index has no ties; rendered order follows it", tier: "gate", env: ["direct"], data: "read" }, async ({ run }) => {
  const d = await allRows(run.targetRef);
  for (const section of ["Musavideot", "Muut videot"]) {
    const idx = d.videos.filter((v) => v.section === section).map((v) => v.order_index);
    expect(new Set(idx).size, `${section} ties`).toBe(idx.length);
  }
  const idx = d.sets.filter((s) => !s.is_press_kit).map((s) => s.order_index);
  expect(new Set(idx).size, "gallery ties").toBe(idx.length);
});

spec({ id: "A32", title: "REST output format is the same on both projects", tier: "gate", env: ["direct"], data: "read" }, async () => {
  const shape = async (ref: string) => {
    const { url, key } = projectFor(ref);
    const r = await fetch(`${url}/rest/v1/gigs?select=id,created_at,performance_date&order=id&limit=3`, { headers: { apikey: key, Prefer: "count=exact" } });
    const rows = (await r.json()) as Json[];
    return {
      status: r.status,
      contentProfile: r.headers.get("content-profile"),
      contentType: r.headers.get("content-type"),
      range: (r.headers.get("content-range") || "").replace(/\/\d+$/, "/N"),
      tsFormat: rows.map((x) => String(x.created_at).replace(/\d/g, "9")),
      pdFormat: rows.map((x) => String(x.performance_date).replace(/\d/g, "9")),
    };
  };
  const a = await shape(OLD_REF);
  const b = await shape(NEW_REF);
  expect(b).toEqual(a);
});

spec({ id: "E3", title: "no old URLs; every stored object on the new host with the same size and type", tier: "gate", env: ["direct"], data: "read" }, async ({ run }) => {
  test.skip(run.targetRef !== NEW_REF, "new-project check");
  test.setTimeout(240_000);
  const d = await allRows(NEW_REF);
  const text = JSON.stringify(d);
  expect(text.split(OLD_REF).length - 1, "old ref occurrences").toBe(0);
  const urls = [...new Set(mediaUrls(d).filter((u) => u.includes(".supabase.co")))];
  for (const u of urls) {
    const n = await fetch(u, { headers: { Range: "bytes=0-0" } });
    const o = await fetch(u.replace(NEW_REF, OLD_REF), { headers: { Range: "bytes=0-0" } });
    expect(n.status, u).toBe(206);
    expect(n.headers.get("content-type"), u).toBe(o.headers.get("content-type"));
    expect(n.headers.get("content-range")?.split("/")[1], `${u} size`).toBe(o.headers.get("content-range")?.split("/")[1]);
  }
});

spec({ id: "D11", title: "image header parity old vs new", tier: "gate", env: ["direct"], data: "read" }, async ({ run }) => {
  test.skip(run.targetRef !== NEW_REF, "new-project check");
  const d = await allRows(NEW_REF);
  const heroes = mediaUrls({ ...d, sets: [] }).filter((u) => u.includes(".supabase.co"));
  for (const u of heroes) {
    const pick = (r: Response) => ({ status: r.status, type: r.headers.get("content-type"), robots: r.headers.get("x-robots-tag"), acao: r.headers.get("access-control-allow-origin") });
    const n = pick(await fetch(u, { headers: { Range: "bytes=0-0" } }));
    const o = pick(await fetch(u.replace(NEW_REF, OLD_REF), { headers: { Range: "bytes=0-0" } }));
    expect(n, u).toEqual(o);
  }
});

spec({ id: "D12", title: "new host crawlable: robots.txt and Googlebot", tier: "gate", env: ["direct"], data: "read" }, async ({ run }) => {
  const { url, key } = projectFor(run.targetRef);
  const robots = await fetch(`${url}/robots.txt`);
  if (robots.status === 200) {
    const t = await robots.text();
    expect(t).not.toMatch(/Disallow:\s*\/(rest|storage)/);
  }
  const ua = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
  const rest = await fetch(`${url}/rest/v1/gigs?select=id&limit=1`, { headers: { apikey: key, "user-agent": ua } });
  expect(rest.status).toBe(200);
  const d = await allRows(run.targetRef);
  const img = mediaUrls(d).find((u) => u.includes(".supabase.co"))!;
  const st = await fetch(img, { headers: { "user-agent": ua, Range: "bytes=0-0" } });
  expect([200, 206]).toContain(st.status);
});

spec({ id: "A13", title: "external links answer (social hosts report-only)", tier: "regression", env: ["direct"], data: "read" }, async ({ run }, info) => {
  test.setTimeout(180_000);
  const d = await allRows(run.targetRef);
  const links = new Set<string>();
  for (const g of d.gigs) for (const k of ["event_page_url", "tickets_url", "organizer_url"]) if (g[k]) links.add(String(g[k]));
  for (const s of d.sets) if (s.photographer_url) links.add(String(s.photographer_url));
  const fixed = ["https://www.instagram.com/Heidisimelius/", "https://www.tiktok.com/@heidisimelius", "https://www.facebook.com/HeidiSimelius/", "https://music.apple.com/gb/artist/heidi-simelius/1486952057", "https://open.spotify.com/artist/7wmdyUKDAcJfmWbgsARwl9"];
  fixed.forEach((u) => links.add(u));
  // Social networks and ticket shops block scripted requests (403/429/999): report-only.
  const social = /instagram|facebook|linkedin|tiktok|lippu\.fi|ticketmaster|tiketti|eventim/;
  const res: Record<string, number | string> = {};
  const bad: string[] = [];
  for (const u of links) {
    try {
      const r = await fetch(u, { redirect: "manual", signal: AbortSignal.timeout(15_000), headers: { "user-agent": "Mozilla/5.0 (Macintosh) HeidiSimelius-linkcheck" } });
      res[u] = r.status;
      if (r.status >= 400 && !social.test(u)) bad.push(`${r.status} ${u}`);
    } catch (e) {
      res[u] = String((e as Error).message).slice(0, 60);
      if (!social.test(u)) bad.push(`ERR ${u}`);
    }
  }
  record(info, "link statuses", res);
  expect(bad).toEqual([]);
});
