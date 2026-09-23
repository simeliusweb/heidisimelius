// 2B.5: Q1 on the new project vs the Lovable Q1 snapshot (artifacts/2A/q1.json), with the plan's allow-list.
import fs from "node:fs";
import path from "node:path";
import { REPO, STATE, sbq, result } from "./lib.mjs";

const src = JSON.parse(fs.readFileSync(path.join(STATE, "artifacts/2A/q1.json"), "utf8"));
const [{ q1: dst }] = await sbq(fs.readFileSync(path.join(REPO, "scripts/migration/sql/q1.sql"), "utf8"), { readOnly: true });
fs.writeFileSync(path.join(STATE, "artifacts/2A/q1-new.json"), JSON.stringify(dst, null, 1));

// Allow-listed: whoami, objects (copied later), extensions, acl/default_acl, event triggers (platform), the 2 new
// gig columns + their CHECKs, and [D-SEC] policy names/quals.
const NEW_COLS = new Set(["ticket_price", "duration_minutes"]);
const norm = {
  columns: (l) => l.filter((c) => !(c.t === "gigs" && NEW_COLS.has(c.col))),
  constraints: (l) => l.filter((c) => !/ticket_price|duration_minutes/.test(c.def)),
  rls: (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { on: v.on, forced: v.forced, owner: v.owner }])),
  // Read policies must be identical; write policies are checked separately below.
  policies: (l) => l.filter((p) => p.cmd === "SELECT"),
};
const canon = (x) =>
  Array.isArray(x) ? x.map(canon).sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1))
  : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, canon(x[k])]))
  : x;
const ignore = new Set(["whoami", "objects", "extensions", "default_acl", "event_triggers"]);
const diffs = [];
for (const k of Object.keys(src)) {
  if (ignore.has(k)) continue;
  const f = norm[k] || ((x) => x);
  const a = JSON.stringify(canon(f(src[k]))), b = JSON.stringify(canon(f(dst[k])));
  if (a !== b) diffs.push(k);
}
// Write policies: same count and command/bucket coverage, now claim-gated.
const writes = (q) => q.policies.filter((p) => p.cmd !== "SELECT").map((p) => `${p.s}.${p.t}:${p.cmd}:${(p.using || p.check || "").match(/bucket_id = '([^']+)'/)?.[1] || ""}`).sort();
const claimOk = dst.policies.filter((p) => p.cmd !== "SELECT").every((p) => /cms_admin/.test(`${p.using} ${p.check}`));
if (JSON.stringify(writes(src)) !== JSON.stringify(writes(dst))) diffs.push("write-policy-coverage");
if (!claimOk) diffs.push("write-policy-claim");
const extDiff = { onlyOld: src.extensions.filter((x) => !dst.extensions.includes(x)), onlyNew: dst.extensions.filter((x) => !src.extensions.includes(x)) };
result("2B.5", diffs.length === 0, { diffs, extDiff, newCols: dst.columns.filter((c) => NEW_COLS.has(c.col)).length });
