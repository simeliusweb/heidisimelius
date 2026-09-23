// X1 (B.1): GET the 4 tables from a project's REST API into $STATE/exports/<ts>/, raw bytes as served.
// Fails on any non-2xx, on an empty table, and when the row count != the Content-Range total.
// Prints the sha256 of each file; the combined hash is the drift sentinel (8.2 / 8.8).
//   node export.mjs [--project old|new] [--label name]
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { STATE, TABLES, TABLE_KEY, env, guardFetch, anonHeaders, result, ts, ensureDir, writeState } from "./lib.mjs";

const args = process.argv.slice(2);
const project = args.includes("--project") ? args[args.indexOf("--project") + 1] : "old";
const label = args.includes("--label") ? args[args.indexOf("--label") + 1] : "";
const e = env();
const base = project === "new" ? e.NEW_URL : e.OLD_URL;
const key = project === "new" ? e.NEW_PUB : e.OLD_ANON;

export async function exportTables(outDir) {
  const hashes = {};
  const counts = {};
  for (const t of TABLES) {
    const r = await guardFetch(`${base}/rest/v1/${t}?select=*&order=${TABLE_KEY[t]}.asc`, {
      headers: { ...anonHeaders(key), Prefer: "count=exact", Accept: "application/json" },
    });
    if (!r.ok) throw new Error(`${t}: HTTP ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    const total = Number((r.headers.get("content-range") || "").split("/")[1]);
    const rows = JSON.parse(buf.toString("utf8"));
    if (!rows.length) throw new Error(`${t}: empty`);
    if (rows.length !== total) throw new Error(`${t}: ${rows.length} rows != Content-Range ${total}`);
    fs.writeFileSync(path.join(outDir, `${t}.json`), buf, { mode: 0o600 });
    fs.writeFileSync(
      path.join(outDir, `${t}.headers.json`),
      JSON.stringify({ "content-range": r.headers.get("content-range"), "content-type": r.headers.get("content-type"), "sb-project-ref": r.headers.get("sb-project-ref") }, null, 1),
      { mode: 0o600 },
    );
    hashes[t] = crypto.createHash("sha256").update(buf).digest("hex");
    counts[t] = rows.length;
  }
  const combined = crypto.createHash("sha256").update(TABLES.map((t) => hashes[t]).join("\n")).digest("hex");
  return { hashes, counts, combined };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const outDir = ensureDir(path.join(STATE, "exports", `${ts()}-${project}${label ? "-" + label : ""}`));
  try {
    const r = await exportTables(outDir);
    writeState((s) => {
      s.exports ||= [];
      s.exports.push({ at: new Date().toISOString(), project, label, dir: outDir, combined: r.combined, counts: r.counts });
      if (project === "old") s.last_old_export = { dir: outDir, combined: r.combined };
    });
    result("X1", true, { project, dir: path.basename(outDir), counts: r.counts, sha256: r.combined.slice(0, 16) });
  } catch (err) {
    result("X1", false, { project, error: String(err.message || err) });
  }
}
