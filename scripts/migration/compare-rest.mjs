// B.3: old REST vs new REST, row by row. Exit 0 equal, 1 different, 3 DRIFT (old DB changed since the last X1).
//   REWRITE=1 node compare-rest.mjs     maps old storage-host strings to the new host; asserts exactly 62 of them
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { OLD_REF, TABLES, TABLE_KEY, env, guardFetch, anonHeaders, readState, result } from "./lib.mjs";

const e = env();
const rewrite = process.env.REWRITE === "1";
const EXPECTED_REPLACEMENTS = Number(process.env.EXPECTED_REPLACEMENTS || 62);
const oldPrefix = `https://${OLD_REF}.supabase.co/storage/v1/object/public/`;
const newPrefix = `https://${e.NEW_REF}.supabase.co/storage/v1/object/public/`;
const ISO = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}(:?\d{2})?|Z)?$/;

async function fetchAll(base, key) {
  const out = {};
  const raw = {};
  for (const t of TABLES) {
    const r = await guardFetch(`${base}/rest/v1/${t}?select=*&order=${TABLE_KEY[t]}.asc`, { headers: { ...anonHeaders(key), Accept: "application/json" } });
    if (!r.ok) throw new Error(`${base} ${t}: ${r.status}`);
    raw[t] = Buffer.from(await r.arrayBuffer());
    out[t] = JSON.parse(raw[t].toString("utf8"));
  }
  return { out, raw };
}

// UTC microseconds, so "+00:00" vs "Z" and trailing-zero precision don't count as differences.
function normTs(s) {
  const m = s.match(/^(.*?)(\.(\d+))?([+-]\d{2}:?\d{2}|Z)?$/);
  const base = new Date((m[1].replace(" ", "T")) + (m[4] ? (m[4] === "Z" ? "Z" : m[4]) : "Z"));
  const us = (m[3] || "").padEnd(6, "0").slice(0, 6);
  return `${base.toISOString().slice(0, 19)}.${us}Z`;
}

let replacements = 0;
// Only old-side values are rewritten; a leftover old URL on the new side stays a difference.
function norm(v, side) {
  if (Array.isArray(v)) return v.map((x) => norm(x, side));
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, norm(v[k], side)]));
  if (typeof v === "string") {
    if (ISO.test(v)) return normTs(v);
    if (rewrite && side === "old" && v.startsWith(oldPrefix)) {
      replacements++;
      return newPrefix + v.slice(oldPrefix.length);
    }
  }
  return v;
}

const oldSide = await fetchAll(e.OLD_URL, e.OLD_ANON);
const newSide = await fetchAll(e.NEW_URL, e.NEW_PUB);

// Drift: the old DB changed since the last X1 snapshot.
const st = readState();
let drift = false;
if (st.last_old_export?.dir && fs.existsSync(st.last_old_export.dir)) {
  drift = TABLES.some((t) => {
    const snap = fs.readFileSync(path.join(st.last_old_export.dir, `${t}.json`));
    return crypto.createHash("sha256").update(snap).digest("hex") !== crypto.createHash("sha256").update(oldSide.raw[t]).digest("hex");
  });
}

const diffs = [];
for (const t of TABLES) {
  const k = TABLE_KEY[t];
  const nmap = new Map(newSide.out[t].map((r) => [r[k], r]));
  for (const r of oldSide.out[t]) {
    const n = nmap.get(r[k]);
    if (!n) { diffs.push(`${t}:${r[k]}:missing`); continue; }
    const { ticket_price, duration_minutes, ...nRest } = n; // the 2 new columns only exist on the new DB
    void ticket_price; void duration_minutes;
    if (JSON.stringify(norm(r, "old")) !== JSON.stringify(norm(nRest, "new"))) diffs.push(`${t}:${r[k]}`);
    nmap.delete(r[k]);
  }
  for (const id of nmap.keys()) diffs.push(`${t}:${id}:extra`);
}
const ok = diffs.length === 0 && (!rewrite || replacements === EXPECTED_REPLACEMENTS);
result("compare-rest", ok, { rewrite, replacements, diffs: diffs.slice(0, 20), drift });
process.exit(drift ? 3 : ok ? 0 : 1);
