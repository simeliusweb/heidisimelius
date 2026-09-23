// B.7: baseline capture of a deployment → $STATE/baselines/<label>/{meta,http,data,rendered}.json
//   node capture.mjs --label BL0 --base https://www.heidisimelius.fi [--layers http,data,rendered]
// Layers:
//   http      redirect:manual fetches of every route/edge path; status, location, selected headers, head tags,
//             static JSON-LD, supabase hosts in HTML, bundle name + hosts + key type + brotli size
//   data      REST counts, sb-project-ref, per-table normalised md5, URL-host tally, ranged GET of every storage URL
//   rendered  Chromium at T0 (fixed Date), Europe/Helsinki: head after Helmet, JSON-LD, normalised text with
//             every "Näytä lisää" expanded, counts, images, iframes, request hosts, console errors, CDP Supabase
//             timings, LCP element and time
// Only GETs; the preview bypass goes only to the preview origin (header or cookie), never to third parties.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { chromium } from "@playwright/test";
import { STATE, OLD_REF, TABLES, TABLE_KEY, env, guardFetch, ensureDir, result } from "./lib.mjs";

const args = process.argv.slice(2);
const arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const label = arg("--label");
const base = (arg("--base") || "").replace(/\/$/, "");
if (!label || !base) throw new Error("usage: capture.mjs --label <name> --base <url> [--layers http,data,rendered]");
const layers = new Set((arg("--layers", "http,data,rendered")).split(","));
const e = env();
const T0 = arg("--t0", e.T0 || "2026-09-23T12:00:00.000Z");
const origin = new URL(base).origin;
const host = new URL(base).hostname;
const ENV = host === "localhost" || host === "127.0.0.1" ? "L" : host.endsWith(".vercel.app") ? "P" : "prod";
const bypass = ENV === "P" ? { "x-vercel-protection-bypass": e.VERCEL_AUTOMATION_BYPASS_SECRET } : {};
const out = ensureDir(path.join(STATE, "baselines", label));
const ROUTES = ["/", "/bio", "/keikat", "/galleria", "/bilebandi-heidi-and-the-hot-stuff", "/laulunopetus"];
const REF_RE = /([a-z0-9]{20})\.supabase\.co/g;
const md5 = (s) => crypto.createHash("md5").update(s).digest("hex");
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const HDRS = ["content-type", "cache-control", "x-robots-tag", "location", "strict-transport-security", "x-content-type-options", "x-frame-options", "content-security-policy", "referrer-policy", "permissions-policy", "access-control-allow-origin", "content-disposition"];

const siteFetch = (p, init = {}) => {
  const url = p.startsWith("http") ? p : `${origin}${p}`;
  const same = new URL(url).origin === origin;
  return guardFetch(url, { redirect: "manual", ...init, headers: { ...(same ? bypass : {}), ...(init.headers || {}) } });
};

function headOf(html) {
  const metas = {};
  for (const m of html.matchAll(/<meta\s+([^>]*)>/g)) {
    const a = Object.fromEntries([...m[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map((x) => [x[1], x[2]]));
    const k = a.name || a.property;
    if (k) (metas[k] ||= []).push(a.content);
  }
  return {
    title: html.match(/<title[^>]*>([^<]*)<\/title>/)?.[1] ?? null,
    canonical: [...html.matchAll(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/g)].map((x) => x[1]),
    metas,
    jsonld: [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)].map((x) => { try { return JSON.parse(x[1]); } catch { return x[1]; } }),
    supabaseHosts: [...new Set([...html.matchAll(REF_RE)].map((x) => x[0]))],
    bundles: [...new Set([...html.matchAll(/\/assets\/[A-Za-z0-9_.-]+\.(?:js|css)/g)].map((x) => x[0]))],
  };
}

async function httpLayer() {
  const sitemap = await (await siteFetch("/sitemap.xml")).text().catch(() => "");
  const sitemapPaths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  const paths = [...new Set([...ROUTES, ...sitemapPaths, "/this-page-does-not-exist-e2e", "/wp-admin", "/bilebandi-heidi-", "/keikat/", "/bio/", "//keikat", "/KEIKAT", "/admin", "/login", "/robots.txt", "/sitemap.xml", "/llms.txt", "/404.html", "/index.html", "/api/send-email", "/api/keep-db-alive"])];
  const entries = [];
  for (const p of paths) {
    const r = await siteFetch(p);
    const body = Buffer.from(await r.arrayBuffer());
    const text = body.toString("utf8");
    const isHtml = (r.headers.get("content-type") || "").includes("html");
    entries.push({
      path: p,
      status: r.status,
      headers: Object.fromEntries(HDRS.map((h) => [h, r.headers.get(h)])),
      bodySha: sha(text.replace(/\/assets\/index-[A-Za-z0-9_-]+\./g, "/assets/index-H.").replace(REF_RE, "REF.supabase.co")),
      head: isHtml ? headOf(text) : undefined,
      text: /\.(txt|xml)$/.test(p) ? text.slice(0, 5000) : undefined,
    });
  }
  if (ENV === "prod") {
    for (const u of ["https://heidisimelius.fi/", "http://www.heidisimelius.fi/", "https://heidisimelius.fi/keikat"]) {
      const r = await fetch(u, { redirect: "manual" });
      entries.push({ path: u, prodOnly: true, status: r.status, headers: { location: r.headers.get("location") } });
    }
  }
  const html = await (await siteFetch("/")).text();
  const main = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0];
  let bundle = null;
  if (main) {
    const js = Buffer.from(await (await siteFetch(main)).arrayBuffer());
    const s = js.toString("utf8");
    const refs = [...s.matchAll(REF_RE)].map((m) => m[1]);
    bundle = {
      name: main,
      bytes: js.length,
      brotli: zlib.brotliCompressSync(js, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length,
      refs: [...new Set(refs)],
      refCount: refs.length,
      keyType: /sb_publishable_/.test(s) ? "publishable" : /eyJhbGciOi/.test(s) ? "legacy-jwt" : "none",
      supabaseJs: s.match(/supabase-js\/(\d+\.\d+\.\d+)/)?.[1] ?? null,
    };
  }
  return { env: ENV, entries, bundle };
}

function normRow(v) {
  if (Array.isArray(v)) return v.map(normRow);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).filter((k) => k !== "ticket_price" && k !== "duration_minutes").sort().map((k) => [k, normRow(v[k])]));
  if (typeof v === "string") {
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/.test(v)) return new Date(v).toISOString();
    return v.replace(REF_RE, "REF.supabase.co");
  }
  return v;
}

async function dataLayer(ref) {
  const key = ref === e.NEW_REF ? e.NEW_PUB : ref === OLD_REF ? e.OLD_ANON : null;
  if (!key) throw new Error(`no key for ref ${ref}`);
  const url = `https://${ref}.supabase.co`;
  const tables = {};
  const hosts = {};
  const storageUrls = new Set();
  for (const t of TABLES) {
    const r = await guardFetch(`${url}/rest/v1/${t}?select=*&order=${TABLE_KEY[t]}.asc`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" } });
    const rows = await r.json();
    tables[t] = { count: rows.length, contentRange: r.headers.get("content-range"), sbProjectRef: r.headers.get("sb-project-ref"), md5: md5(JSON.stringify(normRow(rows))) };
    const s = JSON.stringify(rows);
    for (const m of s.matchAll(/https?:\/\/([a-z0-9.-]+)\//g)) hosts[m[1].replace(REF_RE, "REF.supabase.co")] = (hosts[m[1].replace(REF_RE, "REF.supabase.co")] || 0) + 1;
    for (const m of s.matchAll(/https:\/\/[a-z0-9]{20}\.supabase\.co\/storage\/v1\/object\/public\/[A-Za-z0-9._/%-]+/g)) storageUrls.add(m[0]);
  }
  const storage = {};
  for (const u of [...storageUrls].sort()) {
    const r = await guardFetch(u, { headers: { Range: "bytes=0-0" } });
    await r.arrayBuffer();
    storage[u.replace(REF_RE, "REF.supabase.co")] = { status: r.status, type: r.headers.get("content-type"), cache: r.headers.get("cache-control"), robots: r.headers.get("x-robots-tag"), acao: r.headers.get("access-control-allow-origin"), size: r.headers.get("content-range")?.split("/")[1] ?? null };
  }
  return { ref, tables, hosts, storage };
}

async function renderedLayer() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ timezoneId: "Europe/Helsinki", locale: "fi-FI", viewport: { width: 1280, height: 900 } });
  if (ENV === "P") {
    await ctx.request.get(`${origin}/?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=${encodeURIComponent(e.VERCEL_AUTOMATION_BYPASS_SECRET)}`, { maxRedirects: 0 });
  }
  const routes = {};
  for (const route of [...ROUTES, "/this-page-does-not-exist-e2e"]) {
    const page = await ctx.newPage();
    await page.clock.install({ time: new Date(T0) });
    await page.clock.resume(); // running clock from T0: a frozen Date stalls GSAP
    await page.route(/\.supabase\.co\//, (r) => (["GET", "HEAD", "OPTIONS"].includes(r.request().method()) ? r.continue() : r.abort()));
    await page.addInitScript(() => {
      window.__lcp = { el: "none", ms: 0 };
      new PerformanceObserver((l) => {
        const x = l.getEntries().at(-1);
        window.__lcp = { el: x?.element ? `${x.element.tagName.toLowerCase()}${x.url ? " " + x.url.split("/").pop() : ""}` : "none", ms: Math.round(x?.startTime || 0) };
      }).observe({ type: "largest-contentful-paint", buffered: true });
    });
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Network.enable");
    const timings = [];
    cdp.on("Network.responseReceived", (ev) => { if (ev.response.url.includes(".supabase.co") && ev.response.timing) timings.push(ev.response.timing.receiveHeadersEnd - ev.response.timing.sendStart); });
    const requests = [];
    const consoleErrors = [];
    page.on("request", (r) => requests.push(r.url()));
    page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(`${m.text().slice(0, 160)} @ ${(m.location()?.url || "").slice(0, 100)}`); });
    page.on("pageerror", (err) => consoleErrors.push(`pageerror ${err.message.slice(0, 160)}`));
    const resp = await page.goto(`${origin}${route}`, { waitUntil: "load", timeout: 60_000 });
    await page.waitForFunction(() => document.querySelectorAll(".animate-pulse").length === 0, undefined, { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const lcp = await page.evaluate(() => window.__lcp);
    for (let i = 0; i < 40; i++) {
      const b = page.getByRole("button", { name: "Näytä lisää" }).first();
      if (!(await b.isVisible().catch(() => false))) break;
      await b.click();
      await page.waitForTimeout(400);
    }
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
    await page.waitForTimeout(1500);
    const snap = await page.evaluate(() => {
      const attr = (sel, a = "content") => [...document.querySelectorAll(sel)].map((x) => x.getAttribute(a));
      return {
        title: document.title,
        head: {
          canonical: attr('link[rel="canonical"]', "href"),
          description: attr('meta[name="description"]'),
          robots: attr('meta[name="robots"]'),
          og: [...document.querySelectorAll('meta[property^="og:"], meta[property^="twitter:"]')].map((m) => `${m.getAttribute("property")}=${m.getAttribute("content")}`),
        },
        jsonld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => { try { return JSON.parse(s.textContent); } catch { return s.textContent; } }),
        text: (document.querySelector("main") || document.body).innerText,
        counts: { h1: document.querySelectorAll("h1").length, h2: document.querySelectorAll("h2").length, h3: document.querySelectorAll("h3").length, img: document.images.length, iframe: document.querySelectorAll("iframe").length },
        images: [...document.images].map((i) => ({ src: i.currentSrc || i.src, w: i.naturalWidth, alt: i.getAttribute("alt") })),
        iframes: [...document.querySelectorAll("iframe")].map((f) => f.getAttribute("src")),
      };
    });
    timings.sort((a, b) => a - b);
    routes[route] = {
      status: resp?.status() ?? null,
      ...snap,
      requestHosts: [...new Set(requests.map((u) => new URL(u).host))].sort(),
      refCounts: { old: requests.filter((u) => u.includes(OLD_REF)).length, new: requests.filter((u) => e.NEW_REF && u.includes(e.NEW_REF)).length },
      consoleErrors,
      supabaseTiming: { n: timings.length, median: Math.round(timings[Math.floor(timings.length / 2)] ?? 0), p90: Math.round(timings[Math.floor(timings.length * 0.9)] ?? 0) },
      lcp,
    };
    await page.close();
  }
  await browser.close();
  return { t0: T0, routes };
}

const meta = { label, base, env: ENV, t0: T0, at: new Date().toISOString(), layers: [...layers] };
let targetRef = null;
try {
  if (layers.has("http")) {
    const h = await httpLayer();
    fs.writeFileSync(path.join(out, "http.json"), JSON.stringify(h, null, 1));
    targetRef = h.bundle?.refs?.[0] ?? null;
    meta.bundle = h.bundle?.name;
  }
  if (!targetRef) {
    const html = await (await siteFetch("/")).text();
    const main = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0];
    targetRef = main ? [...(await (await siteFetch(main)).text()).matchAll(REF_RE)][0]?.[1] : null;
  }
  meta.targetRef = targetRef;
  if (layers.has("data")) fs.writeFileSync(path.join(out, "data.json"), JSON.stringify(await dataLayer(targetRef), null, 1));
  if (layers.has("rendered")) fs.writeFileSync(path.join(out, "rendered.json"), JSON.stringify(await renderedLayer(), null, 1));
  fs.writeFileSync(path.join(out, "meta.json"), JSON.stringify(meta, null, 1));
  result(`capture-${label}`, true, { env: ENV, targetRef, bundle: meta.bundle, layers: [...layers], dir: out.replace(STATE, "$STATE") });
} catch (err) {
  result(`capture-${label}`, false, { error: String(err.message || err).slice(0, 300) });
}
