// X2 (B.2): apply a seed built from an X1 export to the NEW project through the Management API.
// Refuses once state.golive_at is set (the new DB is live then; Heidi's edits would be lost).
//   node import.mjs [--export <dir>] [--no-rewrite]
import fs from "node:fs";
import path from "node:path";
import { STATE, env, readState, sbq, result, setStep, ts, ensureDir } from "./lib.mjs";
import { makeSeed } from "./make-seed.mjs";

const args = process.argv.slice(2);
const st = readState();
if (st.golive_at) {
  result("X2", false, { refused: "golive_at is set" });
  process.exit(2);
}
const dir = args.includes("--export") ? args[args.indexOf("--export") + 1] : st.last_old_export?.dir;
if (!dir || !fs.existsSync(dir)) throw new Error("no X1 export dir");
const e = env();
const { sql, counts, touched } = makeSeed(dir, { rewriteNewRef: args.includes("--no-rewrite") ? undefined : e.NEW_REF });
const seedFile = path.join(ensureDir(path.join(STATE, "build")), `seed-${ts()}.sql`);
fs.writeFileSync(seedFile, sql, { mode: 0o600 });

try {
  await sbq(sql);
  const after = await sbq(
    "select (select count(*) from public.gigs)::int gigs, (select count(*) from public.videos)::int videos, (select count(*) from public.photo_sets)::int photo_sets, (select count(*) from public.page_content)::int page_content",
    { readOnly: true },
  );
  setStep("X2", "done", { export: path.basename(dir) });
  result("X2", true, { export: path.basename(dir), counts: after[0], expected: counts, touched, bytes: sql.length });
} catch (err) {
  result("X2", false, { export: path.basename(dir), error: String(err.message).slice(0, 400) });
}
