// R7: refuse a commit when staged content (or a given git range) contains a secret.
//   node scripts/migration/secret-scan.mjs            staged diff
//   node scripts/migration/secret-scan.mjs A..B       a commit range (log -p)
import { execFileSync } from "node:child_process";
import { env } from "./lib.mjs";

const e = env();
const range = process.argv[2];
const text = range
  ? execFileSync("git", ["log", "-p", "--no-color", range], { maxBuffer: 1 << 28 }).toString()
  : execFileSync("git", ["diff", "--cached", "--no-color"], { maxBuffer: 1 << 28 }).toString();
const added = text.split("\n").filter((l) => l.startsWith("+") || !range).join("\n");
// Real token shapes, so the scripts that merely name these prefixes don't trip the scan.
const patterns = [
  /sb_secret_[A-Za-z0-9_-]{16,}/,
  /sbp_[a-f0-9]{20,}/,
  /eyJhbGciOi[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./,
  /xkeysib-[a-f0-9]{20,}/,
];
const literals = [
  e.VERCEL_AUTOMATION_BYPASS_SECRET, e.VERCEL_TOKEN, e.SUPABASE_PAT, e.NEW_SECRET, e.BREVO_API_KEY,
  e.CMS_ACCOUNT_PASSWORD, e.HEIDI_CMS_PASSWORD, e.TEST_ADMIN_PASSWORD, e.CRON_SECRET,
].filter((v) => v && v.length >= 8);
const hits = patterns.filter((p) => p.test(added)).map(String).concat(literals.filter((v) => added.includes(v)).map(() => "<a known secret value>"));
if (hits.length) {
  console.error(`R7 SECRET SCAN: refused (${hits.length} hit(s)): ${hits.join(", ")}`);
  process.exit(3);
}
console.log(`R7 secret scan clean (${range || "staged"})`);
