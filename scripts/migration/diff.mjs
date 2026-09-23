// B.7: compare two capture.mjs baselines.
//   node diff.mjs BL1 BL2 [--layers http,data,rendered | rendered-data | rendered-text]
// Normalises: project ref, bundle hash, key type, sitemap lastmod, x-vercel-*, date/age/etag/last-modified,
// ordering of request hosts ("ranks"). Performance is compared by threshold (Supabase median ≤ +100 ms,
// LCP ≤ ×1.3), never exactly. Layers an environment can't provide are skipped: http needs both sides on
// Vercel (P or prod); prod-only entries (apex, http://) are dropped when the other side isn't prod, and
// preview-only noindex headers are ignored across environments.
// Exit: 0 equal, 1 different, 3 DRIFT (the data itself changed between the captures).
import fs from "node:fs";
import path from "node:path";
import { STATE } from "./lib.mjs";

const args = process.argv.slice(2);
const [A, B] = args.filter((x) => !x.startsWith("--") && args[args.indexOf(x) - 1] !== "--layers");
if (!A || !B) throw new Error("usage: diff.mjs <labelA> <labelB> [--layers …]");
const layerArg = args.includes("--layers") ? args[args.indexOf("--layers") + 1] : "http,data,rendered";
const layers = new Set(layerArg.split(","));
if (layers.has("rendered")) { layers.add("rendered-data"); layers.add("rendered-text"); layers.add("rendered-perf"); }
const dir = (l) => (fs.existsSync(l) ? l : path.join(STATE, "baselines", l));
const load = (l, f) => { const p = path.join(dir(l), f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null; };
const metaA = load(A, "meta.json"), metaB = load(B, "meta.json");
if (!metaA || !metaB) throw new Error("missing meta.json in one of the baselines");

// Each capture's own deployment origin (every preview has its own hostname) becomes ORIGIN.
const origins = [metaA.base, metaB.base].map((b) => new URL(b).host.replace(/[.]/g, "\\."));
const originRe = new RegExp(`(https?://)?(${origins.join("|")})`, "g");
const norm = (s) =>
  String(s)
    .replace(originRe, (m, scheme) => (scheme ? "https://ORIGIN" : "ORIGIN"))
    .replace(/[a-z0-9]{20}\.supabase\.co/g, "REF.supabase.co")
    .replace(/\/assets\/(index|[A-Za-z]+)-[A-Za-z0-9_-]{8}\.(js|css)/g, "/assets/$1-H.$2")
    .replace(/sb_publishable_[A-Za-z0-9_-]+/g, "KEY")
    .replace(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "KEY")
    .replace(/<lastmod>[^<]*<\/lastmod>/g, "<lastmod/>");
const deep = (v) => (Array.isArray(v) ? v.map(deep) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, deep(v[k])])) : typeof v === "string" ? norm(v) : v);
const diffs = [];
const warnings = [];
const cmp = (where, a, b) => { const x = JSON.stringify(deep(a)), y = JSON.stringify(deep(b)); if (x !== y) diffs.push({ where, a: x.slice(0, 400), b: y.slice(0, 400) }); };
const onVercel = (m) => m.env === "P" || m.env === "prod";
const skipped = [];

// ---- http
if (layers.has("http")) {
  const ha = load(A, "http.json"), hb = load(B, "http.json");
  if (!ha || !hb) skipped.push("http (missing)");
  else if (!onVercel(metaA) || !onVercel(metaB)) skipped.push("http (needs P/prod on both sides)");
  else {
    const crossEnv = metaA.env !== metaB.env;
    const byPath = (h) => new Map(h.entries.filter((e) => !(e.prodOnly && crossEnv)).map((e) => [e.path, e]));
    const pa = byPath(ha), pb = byPath(hb);
    for (const p of new Set([...pa.keys(), ...pb.keys()])) {
      const a = pa.get(p), b = pb.get(p);
      if (!a || !b) { diffs.push({ where: `http ${p}`, a: a ? "present" : "missing", b: b ? "present" : "missing" }); continue; }
      const h = (e) => {
        const x = { ...e.headers };
        if (crossEnv) delete x["x-robots-tag"];
        delete x["cache-control"]; // Vercel varies it by env for the SPA shell
        return x;
      };
      cmp(`http ${p} status`, a.status, b.status);
      cmp(`http ${p} headers`, h(a), h(b));
      if (a.head || b.head) cmp(`http ${p} head`, { ...a.head, bundles: undefined }, { ...b.head, bundles: undefined });
      if (a.text || b.text) cmp(`http ${p} text`, a.text, b.text);
    }
    if (ha.bundle && hb.bundle) {
      cmp("bundle refs", ha.bundle.refs.length, hb.bundle.refs.length);
      cmp("bundle refCount", ha.bundle.refCount, hb.bundle.refCount);
      if (ha.bundle.brotli && hb.bundle.brotli > ha.bundle.brotli * 1.05) diffs.push({ where: "bundle brotli > +5%", a: ha.bundle.brotli, b: hb.bundle.brotli });
    }
  }
}

// ---- data
let drift = false;
if (layers.has("data")) {
  const da = load(A, "data.json"), db = load(B, "data.json");
  if (!da || !db) skipped.push("data (missing)");
  else {
    for (const t of Object.keys(da.tables)) {
      if (da.tables[t].count !== db.tables[t]?.count || da.tables[t].md5 !== db.tables[t]?.md5) {
        drift = true;
        diffs.push({ where: `data ${t}`, a: `${da.tables[t].count} ${da.tables[t].md5}`, b: `${db.tables[t]?.count} ${db.tables[t]?.md5}` });
      }
    }
    cmp("data hosts", da.hosts, db.hosts);
    cmp("data storage", da.storage, db.storage);
  }
}

// ---- rendered
const ra = load(A, "rendered.json"), rb = load(B, "rendered.json");
if ([...layers].some((l) => l.startsWith("rendered"))) {
  if (!ra || !rb) skipped.push("rendered (missing)");
  else {
    if (ra.t0 !== rb.t0) diffs.push({ where: "rendered t0", a: ra.t0, b: rb.t0 });
    for (const r of Object.keys(ra.routes)) {
      const a = ra.routes[r], b = rb.routes[r];
      if (!b) { diffs.push({ where: `rendered ${r}`, a: "present", b: "missing" }); continue; }
      if (layers.has("rendered-data")) {
        cmp(`rendered ${r} status`, a.status, b.status);
        cmp(`rendered ${r} title`, a.title, b.title);
        cmp(`rendered ${r} head`, a.head, b.head);
        cmp(`rendered ${r} jsonld`, a.jsonld, b.jsonld);
        cmp(`rendered ${r} counts`, a.counts, b.counts);
        cmp(`rendered ${r} images`, a.images.map((i) => ({ src: i.src, alt: i.alt, loaded: i.w > 0 })), b.images.map((i) => ({ src: i.src, alt: i.alt, loaded: i.w > 0 })));
        cmp(`rendered ${r} iframes`, a.iframes, b.iframes);
        // First-party and Supabase hosts only: third-party CDN/ad hosts vary by edge and by run.
        const hosts = (l) => [...new Set(l.map(norm))].filter((h) => /^(ORIGIN|REF\.supabase\.co|fonts\.(googleapis|gstatic)\.com)$/.test(h)).sort();
        cmp(`rendered ${r} hosts`, hosts(a.requestHosts), hosts(b.requestHosts));
        cmp(`rendered ${r} console`, a.consoleErrors.filter((c) => !/spotify|youtube|lightwidget/i.test(c)), b.consoleErrors.filter((c) => !/spotify|youtube|lightwidget/i.test(c)));
      }
      if (layers.has("rendered-text")) {
        const t = (x) => norm(x).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
        if (t(a.text) !== t(b.text)) {
          const la = t(a.text).split("\n"), lb = t(b.text).split("\n");
          const i = la.findIndex((l, k) => l !== lb[k]);
          diffs.push({ where: `rendered ${r} text (line ${i})`, a: la.slice(i, i + 3).join(" / "), b: lb.slice(i, i + 3).join(" / ") });
        }
      }
      if (layers.has("rendered-perf")) {
        // Single samples: reported as warnings, not gate failures (F1/F5 gate performance with medians).
        if (b.supabaseTiming.median > a.supabaseTiming.median + 100) warnings.push({ where: `perf ${r} supabase median`, a: a.supabaseTiming.median, b: b.supabaseTiming.median });
        if (a.lcp?.ms > 0 && b.lcp?.ms > a.lcp.ms * 1.3) warnings.push({ where: `perf ${r} LCP`, a: JSON.stringify(a.lcp), b: JSON.stringify(b.lcp) });
      }
    }
  }
}

console.log(JSON.stringify({ A, B, envs: [metaA.env, metaB.env], layers: [...layers], skipped, drift, differences: diffs.length, warnings: warnings.length }, null, 1));
for (const d of diffs.slice(0, 60)) console.log(`- ${d.where}\n    A: ${d.a}\n    B: ${d.b}`);
for (const w of warnings) console.log(`~ warning ${w.where}\n    A: ${w.a}\n    B: ${w.b}`);
process.exit(drift ? 3 : diffs.length ? 1 : 0);
