// 5.1 + 5.2: clone the tested SHA from the local repo into $STATE/build/<sha> (so unpushed commits are
// included and ignored files like .env are not), then a protected CLI preview deployment of it.
//   node deploy-preview.mjs --db old|new [--sha <sha>] [--extra-env KEY=VALUE ...]
// Never deploys to production (no --prod), never links, never pulls env.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { REPO, STATE, OLD_REF, env, result, writeState, writeGenerated, ensureDir } from "./lib.mjs";

const args = process.argv.slice(2);
const arg = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const db = arg("--db");
if (!["old", "new"].includes(db)) throw new Error("--db old|new");
const sha = arg("--sha") || execFileSync("git", ["-C", REPO, "rev-parse", "HEAD"]).toString().trim();
const e = env();

const dir = path.join(ensureDir(path.join(STATE, "build")), sha);
if (!fs.existsSync(dir)) execFileSync("git", ["clone", "-q", REPO, dir]);
execFileSync("git", ["-C", dir, "fetch", "-q", REPO, sha]);
execFileSync("git", ["-C", dir, "checkout", "-q", "--detach", sha]);
execFileSync("git", ["-C", dir, "clean", "-qfdx"]);
const head = execFileSync("git", ["-C", dir, "rev-parse", "HEAD"]).toString().trim();
const dirty = execFileSync("git", ["-C", dir, "status", "--porcelain", "--ignored"]).toString().trim();
if (head !== sha || dirty) throw new Error(`clean clone check failed (head ${head.slice(0, 7)}, dirty: ${dirty.slice(0, 200)})`);
// Deploy an exact archive of the commit without .git: Vercel Hobby blocks CLI deployments whose git
// metadata names a commit author who isn't a team member (the developer's commits).
const tree = `${dir}-tree`;
fs.rmSync(tree, { recursive: true, force: true });
ensureDir(tree);
execFileSync("sh", ["-c", `git -C "${dir}" archive --format=tar ${sha} | tar -x -C "${tree}"`]);

const url = db === "new" ? e.NEW_URL : e.OLD_URL;
const key = db === "new" ? e.NEW_PUB : e.OLD_ANON;
const cronTest = crypto.randomBytes(24).toString("hex"); // the preview keep-alive is never open
const extra = args.flatMap((a, i) => (args[i - 1] === "--extra-env" ? ["--env", a] : []));
const cli = [
  "deploy", tree, "--yes", "--force",
  "--build-env", `VITE_SUPABASE_URL=${url}`, "--build-env", `VITE_SUPABASE_PUBLISHABLE_KEY=${key}`,
  "--env", `VITE_SUPABASE_URL=${url}`, "--env", `VITE_SUPABASE_PUBLISHABLE_KEY=${key}`,
  "--env", `CRON_SECRET=${cronTest}`, "--env", `BREVO_API_KEY=${e.BREVO_API_KEY}`,
  ...extra,
  "--meta", `migrationSha=${sha}`, "--meta", `purpose=${db === "new" ? "bl2" : "bl1"}`,
];
const p = spawnSync("vercel", cli, {
  timeout: 15 * 60_000,
  env: { ...process.env, VERCEL_TOKEN: e.VERCEL_TOKEN, VERCEL_ORG_ID: e.VERCEL_ORG_ID, VERCEL_PROJECT_ID: e.VERCEL_PROJECT_ID },
  encoding: "utf8",
  maxBuffer: 1 << 26,
});
const extraValues = extra.filter((_, i) => i % 2 === 1).map((kv) => kv.slice(kv.indexOf("=") + 1));
const scrub = (s) => [e.VERCEL_TOKEN, e.BREVO_API_KEY, cronTest, key, e.VERCEL_AUTOMATION_BYPASS_SECRET, ...extraValues].filter((v) => v && v.length >= 6).reduce((acc, v) => (v ? acc.split(v).join("<redacted>") : acc), s || "");
const out = scrub(p.stdout) + scrub(p.stderr);
const deployUrl = (out.match(/https:\/\/heidisimelius-[a-z0-9]+-simeliuswebs-projects\.vercel\.app/) || [])[0];
if (p.status !== 0 || !deployUrl) {
  console.error(out.slice(-2000));
  result(`5.2-${db}`, false, { sha: sha.slice(0, 7), status: p.status });
  process.exit(1);
}

// Bundle check through the bypass (header only to the preview origin).
const hdr = { "x-vercel-protection-bypass": e.VERCEL_AUTOMATION_BYPASS_SECRET };
const html = await (await fetch(`${deployUrl}/`, { headers: hdr })).text();
const bundle = (html.match(/assets\/index-[A-Za-z0-9_-]+\.js/) || [])[0];
const js = bundle ? await (await fetch(`${deployUrl}/${bundle}`, { headers: hdr })).text() : "";
const refs = [...new Set(js.match(/[a-z]{20}\.supabase\.co/g) || [])];
const check = {
  bundle,
  refs,
  hasPublishable: js.includes("sb_publishable_"),
  hasJwt: js.includes("eyJhbGciOi"),
  ok: db === "new"
    ? refs.length === 1 && refs[0].startsWith(e.NEW_REF) && js.includes("sb_publishable_") && !js.includes("eyJhbGciOi") && !js.includes(OLD_REF)
    : refs.length === 1 && refs[0].startsWith(OLD_REF),
};
const label = db === "new" ? "BL2" : "BL1";
// E1/E8 on the preview need its keep-alive secret; kept only in the private .env.generated.
writeGenerated({ [`CRON_SECRET_TEST_${label}`]: cronTest });
writeState((s) => {
  s.deploys ||= {};
  s.deploys[label] = { sha, url: deployUrl, bundle, at: new Date().toISOString() };
});
fs.writeFileSync(path.join(STATE, `deploy-${label}-${sha.slice(0, 7)}.log`), out, { mode: 0o600 });
result(`5.2-${db}`, check.ok, { label, sha: sha.slice(0, 7), url: deployUrl, bundle, refs: refs.map((r) => r.slice(0, 6)) });
