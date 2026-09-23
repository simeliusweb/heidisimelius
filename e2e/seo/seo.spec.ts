// D1, D2, D3, D5, D8, D9, D10, D14, D15: SEO / GEO / accessibility.
import crypto from "node:crypto";
import { spec, expect, record, test, pinClock } from "../support/fixtures";
import { BASE_URL, REPO, ROUTES, T0, previewHeaders } from "../support/env";
import { gotoSettled, headInfo, jsonLd, eventsOf, settle } from "../support/site";
import { anonGet } from "../support/rest";
import { pageMetadata, routeMetadata, canonicalUrl } from "../../src/config/metadata";

const fetchSite = (p: string, init: RequestInit = {}) => {
  const url = `${BASE_URL}${p}`;
  return fetch(url, { redirect: "manual", ...init, headers: { ...previewHeaders(url), ...(init.headers as Record<string, string>) } });
};
const metaContent = (html: string, attr: string, name: string) =>
  [...html.matchAll(new RegExp(`<meta[^>]*${attr}="${name}"[^>]*content="([^"]*)"`, "g"))].map((m) => m[1]);
const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

spec({ id: "D1", title: "static meta per route matches metadata.ts", tier: "gate", env: ["P", "prod"], data: "read", smoke: true }, async () => {
  for (const [route, key] of Object.entries(routeMetadata)) {
    const r = await fetchSite(route);
    expect(r.status, route).toBe(200);
    const html = await r.text();
    const m = pageMetadata[key];
    expect(decode(html.match(/<title[^>]*>([^<]*)<\/title>/)?.[1] || ""), `${route} title`).toBe(m.title);
    expect(metaContent(html, "name", "description").map(decode), `${route} description`).toEqual([m.description]);
    expect([...html.matchAll(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/g)].map((x) => x[1]), `${route} canonical`).toEqual([canonicalUrl(route)]);
    expect(metaContent(html, "property", "og:url"), `${route} og:url`).toEqual([canonicalUrl(route)]);
    expect(metaContent(html, "property", "og:title").map(decode), `${route} og:title`).toEqual([m.title]);
    expect(metaContent(html, "name", "robots"), `${route} robots`).toEqual([]);
  }
});

spec({ id: "D2", title: "rendered head: one canonical, one description, no duplicate Helmet tags", tier: "gate", env: ["L", "P", "prod"], data: "read" }, async ({ page }) => {
  for (const route of ROUTES) {
    await gotoSettled(page, route);
    const dup = await page.evaluate(() => {
      const keys = [...document.head.querySelectorAll("meta[name], meta[property], link[rel=canonical], title")].map(
        (e) => e.tagName + (e.getAttribute("name") || e.getAttribute("property") || e.getAttribute("rel") || ""),
      );
      return keys.filter((k, i) => keys.indexOf(k) !== i);
    });
    expect(dup, `${route} duplicated head tags`).toEqual([]);
    const h = await headInfo(page);
    expect(h.canonical.length, route).toBe(1);
    expect(h.description.length, route).toBe(1);
  }
});

spec({ id: "D3", title: "/keikat Events match the DB at T0; images answer; Person/Service intact", tier: "gate", env: ["L", "P", "prod"], data: "read" }, async ({ page, run }) => {
  const rows = await anonGet<{ title: string; performance_date: string; image_url: string }>(
    run.targetRef,
    `gigs?select=title,performance_date,image_url&performance_date=gte.${encodeURIComponent(T0)}&order=performance_date.asc`,
  );
  await gotoSettled(page, "/keikat");
  const ev = eventsOf(await jsonLd(page));
  expect(ev.map((e) => [e.name, new Date(String(e.startDate)).toISOString()])).toEqual(rows.map((r) => [r.title, new Date(r.performance_date).toISOString()]));
  for (const img of new Set(ev.flatMap((e) => (e.image as string[]) || []))) {
    const abs = new URL(img, BASE_URL).toString();
    const r = await fetch(abs, { headers: { Range: "bytes=0-0", ...previewHeaders(abs) } });
    expect([200, 206], img).toContain(r.status);
  }
  await gotoSettled(page, "/bio");
  const person = (await jsonLd(page)).find((j) => (j as { "@type"?: string })["@type"] === "Person") as Record<string, unknown>;
  expect(person?.name).toBe("Heidi Simelius");
  await gotoSettled(page, "/laulunopetus");
  const service = (await jsonLd(page)).find((j) => (j as { "@type"?: string })["@type"] === "Service");
  expect(service).toBeTruthy();
});

spec({ id: "D5", title: "sitemap and robots", tier: "gate", env: ["P", "prod"], data: "read" }, async (_args, info) => {
  const sm = await (await fetchSite("/sitemap.xml")).text();
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  expect(locs.length).toBe(6);
  for (const loc of locs) {
    const path = new URL(loc).pathname;
    const r = await fetchSite(path);
    expect(r.status, loc).toBe(200);
    const html = await r.text();
    expect([...html.matchAll(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/g)].map((x) => x[1]), `${loc} self-canonical`).toEqual([loc]);
  }
  const robots = await (await fetchSite("/robots.txt")).text();
  record(info, "robots.txt", robots);
  expect(robots).toContain("Sitemap: https://www.heidisimelius.fi/sitemap.xml");
});

const UAS: Record<string, string> = {
  "googlebot-desktop": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "googlebot-mobile": "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  bingbot: "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
  GPTBot: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot",
  "OAI-SearchBot": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot",
  "ChatGPT-User": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot",
  ClaudeBot: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
  "Claude-User": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-User/1.0; +Claude-User@anthropic.com)",
  PerplexityBot: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)",
  CCBot: "CCBot/2.0 (https://commoncrawl.org/faq/)",
  Applebot: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)",
  "meta-externalagent": "meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)",
  facebookexternalhit: "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  WhatsApp: "WhatsApp/2.23.20.0",
  LinkedInBot: "LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)",
  Slackbot: "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
  Bytespider: "Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)",
  "python-requests": "python-requests/2.32.3",
  empty: "",
};
const bodyHash = (s: string) => crypto.createHash("sha256").update(s.replace(/index-[A-Za-z0-9_-]+\.(js|css)/g, "index-H.$1").replace(/[a-z0-9]{20}\.supabase\.co/g, "REF")).digest("hex").slice(0, 16);

spec({ id: "D8", title: "crawler UAs get the same status and body as a browser", tier: "gate", env: ["prod", "P"], data: "read", post: false, extraTags: ["@post-gate"] }, async (_args, info) => {
  test.setTimeout(300_000);
  const paths = [...ROUTES, "/this-page-does-not-exist-e2e"];
  const table: Record<string, string> = {};
  for (const p of paths) {
    const ref = await fetchSite(p);
    const want = `${ref.status} ${bodyHash(await ref.text())}`;
    for (const [name, ua] of Object.entries(UAS)) {
      const r = await fetchSite(p, { headers: { "user-agent": ua } });
      const got = `${r.status} ${bodyHash(await r.text())}`;
      table[`${p} ${name}`] = got;
      expect(got, `${p} as ${name}`).toBe(want);
    }
  }
  record(info, "ua table (status + normalised body hash)", table);
});

spec({ id: "D9", title: "JSON-LD lint per route", tier: "gate", env: ["L", "P", "prod"], data: "read" }, async ({ page, run }) => {
  const expectBlocks: Record<string, (b: unknown[]) => void> = {
    "/": (b) => expect(b).toEqual([]),
    "/galleria": (b) => expect(b).toEqual([]),
    "/bio": (b) => { expect(b.length).toBe(1); expect((b[0] as Record<string, unknown>)["@type"]).toBe("Person"); },
    "/bilebandi-heidi-and-the-hot-stuff": (b) => { expect(b.length).toBe(1); expect((b[0] as Record<string, unknown>)["@type"]).toBe("MusicGroup"); },
    "/laulunopetus": (b) => { expect(b.length).toBe(1); expect((b[0] as Record<string, unknown>)["@type"]).toBe("Service"); },
    "/keikat": (b) => { expect(b.length).toBe(1); expect(Array.isArray(b[0])).toBe(true); },
    "/this-page-does-not-exist-e2e": (b) => expect(b).toEqual([]),
  };
  const created = new Map((await anonGet<{ title: string; performance_date: string; created_at: string }>(run.targetRef, "gigs?select=title,performance_date,created_at")).map((g) => [`${g.title}|${new Date(g.performance_date).toISOString()}`, g.created_at]));
  for (const [route, check] of Object.entries(expectBlocks)) {
    await gotoSettled(page, route);
    const blocks = await jsonLd(page);
    check(blocks);
    const text = JSON.stringify(blocks);
    expect(text, `${route}: null values`).not.toMatch(/:null[,}]/);
    expect(text, `${route}: empty strings`).not.toMatch(/:""/);
    expect(text, `${route}: http URLs`).not.toMatch(/"http:\/\//);
    for (const e of eventsOf(blocks)) {
      for (const k of ["name", "startDate", "endDate", "location", "image", "eventStatus", "eventAttendanceMode", "performer"]) expect(e, `${e.name} ${k}`).toHaveProperty(k);
      const offers = e.offers as { validFrom?: string } | undefined;
      if (offers) expect(new Date(offers.validFrom!).toISOString()).toBe(new Date(created.get(`${e.name}|${new Date(String(e.startDate)).toISOString()}`)!).toISOString());
    }
  }
});

spec({ id: "D10", title: "timezone correctness of dates and JSON-LD", tier: "gate", env: ["L", "prod"], data: "read" }, async ({ page, run }) => {
  const rows = await anonGet<{ performance_date: string }>(run.targetRef, `gigs?select=performance_date&performance_date=gte.${encodeURIComponent(T0)}&order=performance_date.asc`);
  await gotoSettled(page, "/keikat");
  const hel = eventsOf(await jsonLd(page));
  expect(hel.map((e) => new Date(String(e.startDate)).toISOString())).toEqual(rows.map((r) => new Date(r.performance_date).toISOString()));
  const times = await page.getByText(/^klo \d{2}:\d{2}$/).allInnerTexts();
  const want = new Set(rows.map((r) => `klo ${new Intl.DateTimeFormat("fi-FI", { timeZone: "Europe/Helsinki", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(r.performance_date)).replace(".", ":")}`));
  for (const t of times) expect(want.has(t), t).toBe(true);
  const ctx = await page.context().browser()!.newContext({ baseURL: BASE_URL, timezoneId: "UTC", storageState: `${REPO}/e2e/.auth/state.json` });
  const p2 = await ctx.newPage();
  await pinClock(p2);
  await gotoSettled(p2, "/keikat");
  const utc = await p2.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent));
  const helRaw = await page.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent));
  expect(utc).toEqual(helRaw);
  await ctx.close();
});

spec({ id: "D14", title: "head hygiene through SPA navigation incl. a 404", tier: "gate", env: ["L"], data: "read" }, async ({ page }) => {
  const want: Record<string, { ld: number; canonical: number }> = {
    "/": { ld: 0, canonical: 1 }, "/keikat": { ld: 1, canonical: 1 }, "/bio": { ld: 1, canonical: 1 }, "/this-page-does-not-exist-e2e": { ld: 0, canonical: 0 },
  };
  await gotoSettled(page, "/");
  for (const target of ["/keikat", "/bio", "/keikat", "/this-page-does-not-exist-e2e"]) {
    await page.evaluate((t) => { history.pushState({}, "", t); window.dispatchEvent(new PopStateEvent("popstate")); }, target);
    await settle(page);
    const h = await headInfo(page);
    expect(h.jsonLdCount, `${target} JSON-LD blocks`).toBe(want[target].ld);
    expect(h.canonical.length, `${target} canonicals`).toBe(want[target].canonical);
    if (want[target].canonical) expect(h.ogUrl).toEqual(h.canonical);
    expect(h.lightwidgetScripts).toBeLessThanOrEqual(1);
  }
});

spec({ id: "D15", title: "accessibility of DB media and basic a11y rules", tier: "regression", env: ["L"], data: "read" }, async ({ page, run }, info) => {
  const gigs = await anonGet<{ image_url: string; image_alt: string }>(run.targetRef, "gigs?select=image_url,image_alt");
  const altBySrc = new Map(gigs.map((g) => [g.image_url, g.image_alt]));
  const report: Record<string, unknown> = {};
  for (const route of ROUTES) {
    await gotoSettled(page, route);
    const v = await page.evaluate(() => {
      const imgsNoAlt = [...document.images].filter((i) => !i.hasAttribute("alt")).map((i) => i.src.slice(-50));
      const framesNoTitle = [...document.querySelectorAll("iframe")].filter((f) => !f.title).map((f) => f.src.slice(0, 60));
      const linksNoName = [...document.querySelectorAll("a")].filter((a) => !(a.textContent || "").trim() && !a.getAttribute("aria-label") && !a.querySelector("img[alt]:not([alt=''])")).length;
      const levels = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => Number(h.tagName[1]));
      const skips = levels.filter((l, i) => i > 0 && l - levels[i - 1] > 1).length;
      const mojibake = /Ã[¤¶¥„–]/.test(document.body.innerText);
      return { lang: document.documentElement.lang, title: document.title, imgsNoAlt, framesNoTitle, linksNoName, skips, mojibake };
    });
    report[route] = v;
    expect(v.lang, route).toBe("fi");
    expect(v.title.length, route).toBeGreaterThan(0);
    expect(v.mojibake, `${route} mojibake`).toBe(false);
    const sbImgs = await page.evaluate(() => [...document.images].filter((i) => i.src.includes(".supabase.co")).map((i) => ({ src: i.getAttribute("src")!, alt: i.getAttribute("alt") })));
    for (const i of sbImgs) if (altBySrc.has(i.src) && route === "/keikat") record(info, "gig alt", { src: i.src.slice(-40), alt: i.alt, db: altBySrc.get(i.src) });
  }
  record(info, "a11y", report);
});
