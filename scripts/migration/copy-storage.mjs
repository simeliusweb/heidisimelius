// B.4: copy the 4 public buckets from the old project to the new one.
//   node copy-storage.mjs                  copy (skip when target eTag = source md5; the CV is always re-copied)
//   node copy-storage.mjs --verify-only    new public GET sha256/type = source; ranged GET cache-control + ACAO;
//                                          totals checked against the §2/Q1 numbers, not against its own listing
//   node copy-storage.mjs --report-extras  objects in new that aren't in source (must be 0 at 8.3)
//   node copy-storage.mjs --prune-extras   delete extras that are recorded in a test ledger (never anything else)
// Every source object is also kept in $STATE/exports/storage-mirror (+ manifest.json): that mirror plus the
// X1 JSON is the archive, because Lovable offers no project export.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { STATE, BUCKETS, SOURCE_STORAGE, env, guardFetch, anonHeaders, result, ensureDir } from "./lib.mjs";

const e = env();
const mode = process.argv[2] || "--copy";
const NAME_RE = /^[A-Za-z0-9._/-]+$/;
const enc = (p) => p.split("/").map(encodeURIComponent).join("/");
const mirrorDir = ensureDir(path.join(STATE, "exports", "storage-mirror"));
const md5 = (b) => crypto.createHash("md5").update(b).digest("hex");
const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");

async function list(base, key, bucket, prefix = "") {
  const out = [];
  for (let offset = 0; ; offset += 100) {
    const r = await guardFetch(`${base}/storage/v1/object/list/${bucket}`, {
      method: "POST",
      headers: { ...anonHeaders(key), "content-type": "application/json" },
      body: JSON.stringify({ prefix, limit: 100, offset, sortBy: { column: "name", order: "asc" } }),
    });
    if (!r.ok) throw new Error(`list ${bucket}/${prefix}: ${r.status}`);
    const page = await r.json();
    for (const o of page) {
      const name = prefix ? `${prefix}/${o.name}` : o.name;
      if (o.id === null) out.push(...(await list(base, key, bucket, name)));
      else out.push({ bucket, name, size: o.metadata.size, etag: String(o.metadata.eTag || "").replace(/"/g, ""), mimetype: o.metadata.mimetype, cacheControl: o.metadata.cacheControl });
    }
    if (page.length < 100) break;
  }
  return out;
}

async function listAll(base, key) {
  const all = [];
  for (const b of BUCKETS) all.push(...(await list(base, key, b)));
  for (const o of all) if (!NAME_RE.test(o.name)) throw new Error(`fail-closed: unexpected object name in ${o.bucket}`);
  return all;
}

const multipart = (o) => o.etag.includes("-");

async function downloadSource(o) {
  const mirrorFile = path.join(mirrorDir, o.bucket, o.name);
  if (fs.existsSync(mirrorFile)) {
    const b = fs.readFileSync(mirrorFile);
    if (b.length === o.size && (multipart(o) || md5(b) === o.etag)) return b;
  }
  const deadline = Date.now() + 5 * 60_000;
  for (;;) {
    const r = await guardFetch(`${e.OLD_URL}/storage/v1/object/public/${o.bucket}/${enc(o.name)}`, { cache: "no-store" });
    const b = Buffer.from(await r.arrayBuffer());
    if (r.ok && b.length === o.size && (multipart(o) || md5(b) === o.etag)) {
      ensureDir(path.dirname(mirrorFile));
      fs.writeFileSync(mirrorFile, b, { mode: 0o600 });
      return b;
    }
    if (Date.now() > deadline) throw new Error(`download ${o.bucket}/${o.name}: status ${r.status} size ${b.length}/${o.size}`);
    await new Promise((res) => setTimeout(res, 10_000)); // CDN may serve a stale copy for up to 1 h
  }
}

async function upload(o, body) {
  const r = await fetch(`${e.NEW_URL}/storage/v1/object/${o.bucket}/${enc(o.name)}`, {
    method: "POST",
    headers: { ...anonHeaders(e.NEW_SECRET), "content-type": o.mimetype || "application/octet-stream", "cache-control": "max-age=3600", "x-upsert": "true" },
    body,
  });
  if (!r.ok) throw new Error(`upload ${o.bucket}/${o.name}: ${r.status} ${(await r.text()).slice(0, 200)}`);
}

const src = await listAll(e.OLD_URL, e.OLD_ANON);
const totals = { n: src.length, bytes: src.reduce((a, o) => a + o.size, 0) };

if (mode === "--copy") {
  const dst = new Map((await listAll(e.NEW_URL, e.NEW_SECRET)).map((o) => [`${o.bucket}/${o.name}`, o]));
  let copied = 0, skipped = 0;
  const manifest = {};
  for (const o of src) {
    const body = await downloadSource(o);
    const srcMd5 = md5(body);
    manifest[`${o.bucket}/${o.name}`] = { size: o.size, sha256: sha256(body), mimetype: o.mimetype };
    const t = dst.get(`${o.bucket}/${o.name}`);
    const same = t && (multipart(o) || t.etag.includes("-") ? t.size === o.size : t.etag === srcMd5) && t.mimetype === o.mimetype;
    if (same && o.bucket !== "documents") { skipped++; continue; }
    await upload(o, body);
    copied++;
  }
  fs.writeFileSync(path.join(mirrorDir, "manifest.json"), JSON.stringify(manifest, null, 1), { mode: 0o600 });
  const ok = totals.n === SOURCE_STORAGE.total.n && totals.bytes === SOURCE_STORAGE.total.bytes;
  result("copy-storage", copied === 0 ? "skipped" : ok, { source: totals, copied, skipped, sourceMatchesQ1: ok });
  if (!ok) process.exitCode = 1;
} else if (mode === "--verify-only") {
  const bad = [];
  const perBucket = {};
  for (const o of src) {
    const body = await downloadSource(o);
    const url = `${e.NEW_URL}/storage/v1/object/public/${o.bucket}/${enc(o.name)}`;
    const r = await fetch(url, { cache: "no-store" });
    const nb = Buffer.from(await r.arrayBuffer());
    const rr = await fetch(url, { headers: { Range: "bytes=0-0" }, cache: "no-store" });
    await rr.arrayBuffer();
    const issues = [];
    if (r.status !== 200) issues.push(`status ${r.status}`);
    if (sha256(nb) !== sha256(body)) issues.push("sha256");
    if ((r.headers.get("content-type") || "") !== o.mimetype) issues.push(`type ${r.headers.get("content-type")} != ${o.mimetype}`);
    if (rr.headers.get("cache-control") !== "max-age=3600") issues.push(`cache-control ${rr.headers.get("cache-control")}`);
    if (r.headers.get("access-control-allow-origin") !== "*") issues.push("acao");
    if (issues.length) bad.push({ o: `${o.bucket}/${o.name}`, issues });
    perBucket[o.bucket] ||= { n: 0, bytes: 0 };
    perBucket[o.bucket].n++;
    perBucket[o.bucket].bytes += nb.length;
  }
  const verifiedBytes = Object.values(perBucket).reduce((a, b) => a + b.bytes, 0);
  const vsQ1 = BUCKETS.filter((b) => perBucket[b]?.n !== SOURCE_STORAGE[b].n || perBucket[b]?.bytes !== SOURCE_STORAGE[b].bytes);
  const ok = bad.length === 0 && vsQ1.length === 0 && src.length === SOURCE_STORAGE.total.n && verifiedBytes === SOURCE_STORAGE.total.bytes;
  result("copy-storage-verify", ok, { verified: src.length, bytes: verifiedBytes, mismatchesVsQ1: vsQ1, bad: bad.slice(0, 10) });
} else if (mode === "--report-extras" || mode === "--prune-extras") {
  const have = new Set(src.map((o) => `${o.bucket}/${o.name}`));
  const extras = (await listAll(e.NEW_URL, e.NEW_SECRET)).filter((o) => !have.has(`${o.bucket}/${o.name}`)).map((o) => `${o.bucket}/${o.name}`);
  if (mode === "--prune-extras") {
    const ledgered = new Set();
    for (const f of fs.readdirSync(STATE).filter((n) => /^ledger-.*\.json$/.test(n))) {
      for (const x of JSON.parse(fs.readFileSync(path.join(STATE, f), "utf8")).objects || []) ledgered.add(x);
    }
    const prune = extras.filter((x) => ledgered.has(x));
    for (const x of prune) {
      const [bucket, ...rest] = x.split("/");
      const r = await fetch(`${e.NEW_URL}/storage/v1/object/${bucket}`, {
        method: "DELETE",
        headers: { ...anonHeaders(e.NEW_SECRET), "content-type": "application/json" },
        body: JSON.stringify({ prefixes: [rest.join("/")] }),
      });
      if (!r.ok) throw new Error(`prune ${x}: ${r.status}`);
    }
    const left = extras.filter((x) => !ledgered.has(x));
    result("copy-storage-prune", left.length === 0, { pruned: prune.length, notInLedger: left });
  } else result("copy-storage-extras", extras.length === 0, { extras: extras.length, list: extras.slice(0, 20) });
}
