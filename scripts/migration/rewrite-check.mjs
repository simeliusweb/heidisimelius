// B.5: whole-row zero check for the old ref (A.4) + ranged GET of every storage URL in the new REST data.
// Also 2F.6/8.4: Q4 on the new project, compared with the Lovable Q4 "md5_rewritten" snapshot.
//   node rewrite-check.mjs [--q4-out <artifact name>]
import fs from "node:fs";
import path from "node:path";
import { REPO, STATE, TABLES, TABLE_KEY, env, anonHeaders, sbq, result, ensureDir } from "./lib.mjs";

const e = env();
const [{ remaining }] = await sbq(fs.readFileSync(path.join(REPO, "scripts/migration/sql/a4.sql"), "utf8"), { readOnly: true });

const urls = new Set();
const walk = (v) => {
  if (Array.isArray(v)) v.forEach(walk);
  else if (v && typeof v === "object") Object.values(v).forEach(walk);
  else if (typeof v === "string") for (const m of v.matchAll(/https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/[A-Za-z0-9._/%-]+/g)) urls.add(m[0]);
};
for (const t of TABLES) {
  const r = await fetch(`${e.NEW_URL}/rest/v1/${t}?select=*&order=${TABLE_KEY[t]}.asc`, { headers: anonHeaders(e.NEW_PUB) });
  walk(await r.json());
}
const bad = [];
const foreign = [...urls].filter((u) => !u.startsWith(`${e.NEW_URL}/`));
for (const u of urls) {
  const r = await fetch(u, { headers: { Range: "bytes=0-0" } });
  await r.arrayBuffer();
  if (r.status !== 200 && r.status !== 206) bad.push(`${r.status} ${u.slice(-50)}`);
}
const ok = Number(remaining) === 0 && bad.length === 0 && foreign.length === 0;
result("rewrite-check", ok, { remaining: Number(remaining), urls: urls.size, bad, foreign: foreign.length });

// Q4 checksums vs the Lovable snapshot (md5_rewritten).
const q4 = await sbq(fs.readFileSync(path.join(REPO, "scripts/migration/sql/q4.sql"), "utf8"), { readOnly: true });
const outIdx = process.argv.indexOf("--q4-out");
const outName = outIdx > 0 ? process.argv[outIdx + 1] : "2F/q4-post-import.json";
fs.writeFileSync(path.join(ensureDir(path.join(STATE, "artifacts", path.dirname(outName))), path.basename(outName)), JSON.stringify(q4, null, 1), { mode: 0o600 });
const refFile = process.env.Q4_REF || path.join(STATE, "artifacts/2A/q4.json");
if (fs.existsSync(refFile)) {
  const ref = JSON.parse(fs.readFileSync(refFile, "utf8"));
  const mism = ref.filter((x) => (q4.find((y) => y.tbl === x.tbl) || {}).md5 !== (x.md5_rewritten || x.md5)).map((x) => x.tbl);
  result("q4-compare", mism.length === 0, { ref: path.basename(refFile), mismatch: mism });
}
