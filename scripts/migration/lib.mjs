// Shared helpers for the Lovable Cloud -> own Supabase migration (docs/supabase-migration-plan.md).
// Secrets are read only from ~/.heidisimelius-migration (and the repo's gitignored .env / .env.local);
// nothing here prints a secret value.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const STATE = path.join(os.homedir(), ".heidisimelius-migration");
export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const OLD_REF = "yctdrwogilljanzxcgow";
export const OLD_URL = `https://${OLD_REF}.supabase.co`;
export const BUCKETS = ["images", "documents", "photo_sets_images", "gigs-images"];
export const TABLES = ["gigs", "videos", "photo_sets", "page_content"];
export const TABLE_KEY = { gigs: "id", videos: "id", photo_sets: "id", page_content: "page_name" };
// §2 / Q1 source totals: copy-storage --verify-only checks against these, never against its own listing.
export const SOURCE_STORAGE = {
  total: { n: 75, bytes: 41874215 },
  images: { n: 13, bytes: 12592953 },
  documents: { n: 1, bytes: 129767 },
  photo_sets_images: { n: 37, bytes: 21071131 },
  "gigs-images": { n: 24, bytes: 8080364 },
};

function parseEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
    const line = raw.replace(/\s+#.*$/, "").trim();
    if (!line || line.startsWith("#")) continue;
    // Several KEY=VALUE pairs may share a line (the decisions row); values never contain spaces.
    for (const m of line.matchAll(/([A-Za-z_][A-Za-z0-9_]*)=("[^"]*"|'[^']*'|\S*)/g)) {
      out[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2");
    }
  }
  return out;
}

let envCache;
/** Owner file + agent-generated file + the repo's old values (.env) + CMS login (.env.local). */
export function env() {
  if (envCache) return envCache;
  const repoEnv = parseEnvFile(path.join(REPO, ".env"));
  const local = parseEnvFile(path.join(REPO, ".env.local"));
  envCache = {
    ...parseEnvFile(path.join(STATE, ".env.migration")),
    ...parseEnvFile(path.join(STATE, ".env.generated")),
    OLD_ANON: repoEnv.VITE_SUPABASE_PUBLISHABLE_KEY,
    CMS_ACCOUNT: local.CMS_ACCOUNT,
    CMS_ACCOUNT_PASSWORD: local.CMS_ACCOUNT_PASSWORD,
  };
  if (envCache.NEW_REF) {
    if (envCache.NEW_REF.toLowerCase() === OLD_REF) throw new Error("NEW_REF equals the old project ref");
    envCache.NEW_URL = `https://${envCache.NEW_REF}.supabase.co`;
  }
  return envCache;
}

/** Add or replace keys in $STATE/.env.generated (0600). Values are never printed. */
export function writeGenerated(values) {
  const file = path.join(STATE, ".env.generated");
  const cur = parseEnvFile(file);
  Object.assign(cur, values);
  const body = Object.entries(cur).map(([k, v]) => `${k}=${v}`).join("\n") + "\n";
  fs.writeFileSync(file, body, { mode: 0o600 });
  fs.chmodSync(file, 0o600);
  envCache = undefined;
}

/** R4: any non-GET/HEAD request to the old project throws, except auth token/logout (which nothing makes). */
export function assertAllowed(url, method = "GET") {
  const m = method.toUpperCase();
  const u = new URL(url);
  if (u.hostname.toLowerCase().includes(OLD_REF) && m !== "GET" && m !== "HEAD") {
    const listing = /^\/storage\/v1\/object\/list\//.test(u.pathname); // read-only listing is a POST
    const authOk = /^\/auth\/v1\/(token|logout)/.test(u.pathname);
    if (!listing && !authOk) throw new Error(`R4 guard: refused ${m} ${u.origin}${u.pathname}`);
  }
}

export async function guardFetch(url, opts = {}) {
  assertAllowed(url, opts.method || "GET");
  return fetch(url, opts);
}

/**
 * Go-live detection. After GL the new DB holds Heidi's live edits: nothing may re-import it, and
 * probes may only write with ALLOW_PROD_WRITES=1. Detected from state.golive_at OR from the live
 * production bundle already pointing at the new project, so it works even if nobody set the flag.
 */
export async function goLiveStatus() {
  const e = env();
  const st = readState();
  let prodOnNew = null;
  try {
    const html = await (await fetch("https://www.heidisimelius.fi/", { cache: "no-store" })).text();
    const bundle = (html.match(/assets\/index-[A-Za-z0-9_-]+\.js/) || [])[0];
    const js = bundle ? await (await fetch(`https://www.heidisimelius.fi/${bundle}`)).text() : "";
    prodOnNew = js ? js.includes(`${e.NEW_REF}.supabase.co`) : null;
  } catch {
    prodOnNew = null; // unknown: callers treat unknown as live
  }
  return { flag: st.golive_at || null, prodOnNew, live: Boolean(st.golive_at) || prodOnNew !== false };
}

/** Management API SQL on the NEW project only. */
export async function sbq(query, { readOnly = false } = {}) {
  const e = env();
  if (!e.NEW_REF || e.NEW_REF === OLD_REF) throw new Error("sbq: NEW_REF missing or equals the old ref");
  const r = await fetch(`https://api.supabase.com/v1/projects/${e.NEW_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${e.SUPABASE_PAT}`, "content-type": "application/json" },
    body: JSON.stringify(readOnly ? { query, read_only: true } : { query }),
  });
  const text = await r.text();
  if (r.status === 401) throw new Error("STOP-ALL: 401 from the Supabase PAT");
  if (!r.ok) throw new Error(`sbq ${r.status}: ${text.slice(0, 800)}`);
  return JSON.parse(text);
}

/** Management API (non-SQL) on the new project. */
export async function mgmt(pathname, { method = "GET", body } = {}) {
  const e = env();
  const r = await fetch(`https://api.supabase.com${pathname}`, {
    method,
    headers: { Authorization: `Bearer ${e.SUPABASE_PAT}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  if (r.status === 401) throw new Error("STOP-ALL: 401 from the Supabase PAT");
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: r.status, ok: r.ok, json };
}

export function anonHeaders(key) {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

export function readState() {
  const p = path.join(STATE, "state.json");
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : { steps: {}, halts: [] };
}

export function writeState(mut) {
  const s = readState();
  mut(s);
  fs.writeFileSync(path.join(STATE, "state.json"), JSON.stringify(s, null, 2), { mode: 0o600 });
  return s;
}

export function setStep(id, status, extra = {}) {
  return writeState((s) => {
    s.steps ||= {};
    s.steps[id] = { ...(s.steps[id] || {}), status, at: new Date().toISOString(), ...extra };
  });
}

export function log(line) {
  fs.appendFileSync(path.join(STATE, "run-log.md"), `- ${new Date().toISOString()} ${line}\n`);
}

/** One machine-checkable summary line per script run. */
export function result(id, ok, data = {}) {
  const line = `RESULT ${id} ${ok === "skipped" ? "skipped" : ok ? "ok" : "fail"} ${JSON.stringify(data)}`;
  console.log(line);
  log(line);
  if (ok === false) process.exitCode = 1;
}

export function ts() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true, mode: 0o700 });
  return p;
}
