// B.6: security probes against the NEW project (E4, E12, E13, E14, E15, E19, E24, B5, B22).
// Writes are limited to E2E-TESTI-<runId> rows/objects (deleted at the end, recorded in the ledger) and a
// temporary claimless user that is deleted again. Never runs against the old project (R4).
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { STATE, BUCKETS, TABLES, env, mgmt, anonHeaders, result, goLiveStatus } from "./lib.mjs";

const e = env();
if (process.argv.includes("--project") && process.argv[process.argv.indexOf("--project") + 1] !== "new") {
  throw new Error("probes only run against the new project");
}
const gl = await goLiveStatus();
if (gl.live && process.env.ALLOW_PROD_WRITES !== "1") {
  result("probes", false, { refused: "production is (or may be) live on the new DB; set ALLOW_PROD_WRITES=1 (PA_PROD_TEST_WRITES)", ...gl });
  process.exit(2);
}
const RUN = e.RUN_ID;
const TAG = `E2E-TESTI-${RUN}-probe`;
const fails = [];
const check = (id, cond, detail) => { if (!cond) fails.push(`${id}: ${detail}`); };
const ledgerFile = path.join(STATE, `ledger-${RUN}-probes.json`); // own file: the e2e suite writes ledger-<runId>.json concurrently
const ledger = fs.existsSync(ledgerFile) ? JSON.parse(fs.readFileSync(ledgerFile, "utf8")) : { rows: [], objects: [] };
const saveLedger = () => fs.writeFileSync(ledgerFile, JSON.stringify(ledger, null, 1), { mode: 0o600 });
const md5 = (b) => crypto.createHash("md5").update(b).digest("hex");

const rest = (p, key, opts = {}, bearer = key) =>
  fetch(`${e.NEW_URL}/rest/v1/${p}`, { ...opts, headers: { apikey: key, Authorization: `Bearer ${bearer}`, "content-type": "application/json", Prefer: "return=representation", ...(opts.headers || {}) } });
const admin = (p, opts = {}) =>
  fetch(`${e.NEW_URL}/auth/v1/admin${p}`, { ...opts, headers: { ...anonHeaders(e.NEW_SECRET), "content-type": "application/json" } });
async function token(email, password) {
  const r = await fetch(`${e.NEW_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: e.NEW_PUB, "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
  const j = await r.json();
  if (r.status !== 200) throw new Error(`sign-in failed ${r.status}`);
  return j.access_token;
}

// ---- E14 / B5: auth settings, signup, OTP
const settings = await (await fetch(`${e.NEW_URL}/auth/v1/settings`, { headers: anonHeaders(e.NEW_PUB) })).json();
check("E14", settings.disable_signup === true && settings.external?.anonymous_users !== true && settings.external?.email === true, "settings");
const cfg = (await mgmt(`/v1/projects/${e.NEW_REF}/config/auth`)).json;
check("E5", cfg.disable_signup === true && cfg.external_anonymous_users_enabled === false && cfg.password_min_length === 12 && cfg.site_url === "https://www.heidisimelius.fi", "auth config");
if (settings.disable_signup === true) {
  const probeEmail = `e2e-probe+${RUN}@example.invalid`;
  let r = await fetch(`${e.NEW_URL}/auth/v1/signup`, { method: "POST", headers: { apikey: e.NEW_PUB, "content-type": "application/json" }, body: JSON.stringify({ email: probeEmail, password: crypto.randomBytes(16).toString("hex") }) });
  const j = await r.json().catch(() => ({}));
  check("B5-signup", r.status >= 400 && /signup_disabled|not allowed|disabled/i.test(JSON.stringify(j)), `signup ${r.status}`);
  r = await fetch(`${e.NEW_URL}/auth/v1/signup`, { method: "POST", headers: { apikey: e.NEW_PUB, "content-type": "application/json" }, body: "{}" });
  check("B5-anon", r.status >= 400, `anonymous signup ${r.status}`);
  r = await fetch(`${e.NEW_URL}/auth/v1/otp`, { method: "POST", headers: { apikey: e.NEW_PUB, "content-type": "application/json" }, body: JSON.stringify({ email: probeEmail, create_user: true }) });
  check("B5-otp", r.status >= 400, `otp create_user ${r.status}`);
  const leaked = ((await (await admin("/users?per_page=1000")).json()).users || []).find((u) => u.email === probeEmail);
  if (leaked) { await admin(`/users/${leaked.id}`, { method: "DELETE" }); check("B5", false, "probe user was created (deleted again)"); }
}

// ---- E15: Data API surface
let r = await fetch(`${e.NEW_URL}/rest/v1/`, { headers: anonHeaders(e.NEW_PUB) });
check("E15-root", r.status === 401 || r.status === 403, `GET /rest/v1/ ${r.status}`);
r = await fetch(`${e.NEW_URL}/graphql/v1`, { method: "POST", headers: { ...anonHeaders(e.NEW_PUB), "content-type": "application/json" }, body: JSON.stringify({ query: "{__typename}" }) });
const gqlText = await r.text();
check("E15-graphql", r.status >= 400 || /not.*(enabled|exist)|pg_graphql/i.test(gqlText), `graphql ${r.status}`);
const pg = (await mgmt(`/v1/projects/${e.NEW_REF}/postgrest`)).json;
check("E15-schemas", String(pg.db_schema).split(",").map((s) => s.trim()).filter(Boolean).every((s) => ["public", "graphql_public"].includes(s)), `db_schema ${pg.db_schema}`);
r = await fetch(`${e.NEW_URL}/rest/v1/gigs?select=id&limit=1`, { headers: { apikey: e.NEW_PUB, Authorization: `Bearer ${e.OLD_ANON}` } });
check("E12-oldjwt", r.status === 401, `old-project JWT → ${r.status}`);

// ---- E4 / E12 / B22: table matrix. The "must fail" writes are aimed at E2E rows the test admin
// creates first, so a policy regression can never damage real content.
const adminTok = await token(e.TEST_ADMIN_EMAIL, e.TEST_ADMIN_PASSWORD);
const gigRow = { title: TAG, venue: TAG, image_url: "/images/e2e.jpg", image_alt: TAG, description: TAG, gig_type: "Musiikki", address_locality: "Helsinki", address_country: "FI", performance_date: "2030-01-01T17:00:00Z" };
const rowsFor = {
  gigs: gigRow,
  videos: { url: "https://www.youtube.com/embed/nNooz5tHV6U", title: TAG, section: "Muut videot", order_index: 999 },
  photo_sets: { title: TAG, photographer_name: TAG, photos: [], order_index: 999 },
  page_content: { page_name: TAG, content: { e2e: true } },
};
const sample = {};
for (const t of TABLES) {
  const k = t === "page_content" ? "page_name" : "id";
  r = await rest(t, e.NEW_PUB, { method: "POST", body: JSON.stringify(rowsFor[t]) }, adminTok);
  const [row] = await r.json();
  check("E12-admin-ins", r.status === 201 && row, `${t} insert ${r.status}`);
  if (!row) continue;
  ledger.rows.push(`${t}:${row[k]}`); saveLedger();
  sample[t] = { k, row };
  r = await rest(t, e.NEW_PUB, { method: "POST", body: JSON.stringify(t === "page_content" ? { page_name: TAG, content: {} } : { title: TAG }) });
  check("E4-ins", r.status === 401 || r.status === 403, `${t} anon insert ${r.status}`);
  const field = t === "page_content" ? "content" : t === "videos" ? "description" : "title";
  r = await rest(`${t}?${k}=eq.${encodeURIComponent(row[k])}`, e.NEW_PUB, { method: "PATCH", body: JSON.stringify({ [field]: t === "page_content" ? {} : `${TAG}-anon` }) });
  const pj = await r.json().catch(() => null);
  check("E4-upd", (r.ok && Array.isArray(pj) && pj.length === 0) || r.status === 401, `${t} anon update ${r.status}`);
  r = await rest(`${t}?${k}=eq.${encodeURIComponent(row[k])}`, e.NEW_PUB, { method: "DELETE" });
  const dj = await r.json().catch(() => null);
  check("E4-del", (r.ok && Array.isArray(dj) && dj.length === 0) || r.status === 401, `${t} anon delete ${r.status}`);
  const [again] = await (await rest(`${t}?${k}=eq.${encodeURIComponent(row[k])}&select=*`, e.NEW_PUB)).json();
  check("E4-unchanged", JSON.stringify(again) === JSON.stringify(row), `${t} row changed by anon`);
}

// a claimless authenticated user: must be able to read but not write
const noClaimEmail = `simeliusweb+e2e-noclaim-${RUN}@gmail.com`;
const noClaimPw = crypto.randomBytes(18).toString("base64url");
let cu = await admin("/users", { method: "POST", body: JSON.stringify({ email: noClaimEmail, password: noClaimPw, email_confirm: true }) });
const noClaimUser = await cu.json();
try {
  const noClaimTok = await token(noClaimEmail, noClaimPw);
  for (const t of TABLES) {
    if (!sample[t]) continue;
    const { k, row } = sample[t];
    r = await rest(`${t}?select=${k}&limit=1`, e.NEW_PUB, {}, noClaimTok);
    check("E12-noclaim-sel", r.status === 200, `${t} select ${r.status}`);
    r = await rest(t, e.NEW_PUB, { method: "POST", body: JSON.stringify(t === "page_content" ? { page_name: TAG, content: {} } : { title: TAG }) }, noClaimTok);
    check("E12-noclaim-ins", r.status === 401 || r.status === 403, `${t} insert ${r.status}`);
    r = await rest(`${t}?${k}=eq.${encodeURIComponent(row[k])}`, e.NEW_PUB, { method: "DELETE" }, noClaimTok);
    const dj = await r.json().catch(() => null);
    check("E12-noclaim-del", r.ok && Array.isArray(dj) && dj.length === 0, `${t} delete ${r.status}`);
  }
  // storage: claimless upload refused
  for (const b of BUCKETS) {
    r = await fetch(`${e.NEW_URL}/storage/v1/object/${b}/e2e/${TAG}-noclaim.txt`, { method: "POST", headers: { apikey: e.NEW_PUB, Authorization: `Bearer ${noClaimTok}`, "content-type": "text/plain" }, body: "x" });
    check("E13-noclaim-upload", r.status >= 400, `${b} upload ${r.status}`);
  }
} finally {
  await admin(`/users/${noClaimUser.id}`, { method: "DELETE" });
}

// test admin (claim): update + delete the E2E rows created above
for (const t of TABLES) {
  if (!sample[t]) continue;
  const { k, row } = sample[t];
  const field = t === "page_content" ? "content" : "title";
  r = await rest(`${t}?${k}=eq.${encodeURIComponent(row[k])}`, e.NEW_PUB, { method: "PATCH", body: JSON.stringify({ [field]: t === "page_content" ? { e2e: 2 } : `${TAG}-2` }) }, adminTok);
  check("E12-admin-upd", r.ok && (await r.json()).length === 1, `${t} update ${r.status}`);
  r = await rest(`${t}?${k}=eq.${encodeURIComponent(row[k])}`, e.NEW_PUB, { method: "DELETE" }, adminTok);
  check("E12-admin-del", r.ok && (await r.json()).length === 1, `${t} delete ${r.status}`);
  ledger.rows = ledger.rows.filter((x) => x !== `${t}:${row[k]}`); saveLedger();
}
// B22: admin upsert of bio with identical content leaves the checksum unchanged; anon upsert rejected
const bio = (await (await rest("page_content?page_name=eq.bio&select=*", e.NEW_PUB)).json())[0];
r = await rest("page_content", e.NEW_PUB, { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ page_name: "bio", content: bio.content }) }, adminTok);
const bioAfter = (await (await rest("page_content?page_name=eq.bio&select=*", e.NEW_PUB)).json())[0];
check("B22-admin-upsert", r.ok && JSON.stringify(bioAfter) === JSON.stringify(bio), `admin upsert ${r.status}`);
r = await rest("page_content", e.NEW_PUB, { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ page_name: "bio", content: bio.content }) });
check("B22-anon-upsert", r.status === 401 || r.status === 403, `anon upsert ${r.status}`);

// ---- E13: storage matrix
const cvList = await (await fetch(`${e.NEW_URL}/storage/v1/object/list/documents`, { method: "POST", headers: { ...anonHeaders(e.NEW_PUB), "content-type": "application/json" }, body: JSON.stringify({ prefix: "", limit: 100 }) })).json();
check("E13-anon-list", Array.isArray(cvList), "anon list documents");
for (const b of BUCKETS) {
  const obj = `e2e/${TAG}.txt`;
  r = await fetch(`${e.NEW_URL}/storage/v1/object/${b}/${obj}`, { method: "POST", headers: { ...anonHeaders(e.NEW_PUB), "content-type": "text/plain", "x-upsert": "true" }, body: "anon" });
  check("E13-anon-upload", r.status >= 400, `${b} anon upload ${r.status}`);
  r = await fetch(`${e.NEW_URL}/storage/v1/object/${b}/${obj}`, { method: "POST", headers: { apikey: e.NEW_PUB, Authorization: `Bearer ${adminTok}`, "content-type": "text/plain" }, body: "admin" });
  check("E13-admin-upload", r.ok, `${b} admin upload ${r.status}`);
  if (r.ok) { ledger.objects.push(`${b}/${obj}`); saveLedger(); }
  r = await fetch(`${e.NEW_URL}/storage/v1/object/${b}/${obj}`, { method: "POST", headers: { apikey: e.NEW_PUB, Authorization: `Bearer ${adminTok}`, "content-type": "text/plain", "x-upsert": "true" }, body: "admin2" });
  check("E13-admin-upsert", r.ok, `${b} admin upsert ${r.status}`);
  r = await fetch(`${e.NEW_URL}/storage/v1/object/${b}`, { method: "DELETE", headers: { ...anonHeaders(e.NEW_PUB), "content-type": "application/json" }, body: JSON.stringify({ prefixes: [obj] }) });
  const g = await fetch(`${e.NEW_URL}/storage/v1/object/public/${b}/${obj}`);
  check("E13-anon-delete", g.status === 200 && (await g.text()) === "admin2", `${b} object gone after anon delete (${r.status})`);
  r = await fetch(`${e.NEW_URL}/storage/v1/object/move`, { method: "POST", headers: { ...anonHeaders(e.NEW_PUB), "content-type": "application/json" }, body: JSON.stringify({ bucketId: b, sourceKey: obj, destinationKey: `${obj}.moved` }) });
  check("E13-anon-move", r.status >= 400, `${b} anon move ${r.status}`);
  r = await fetch(`${e.NEW_URL}/storage/v1/object/${b}`, { method: "DELETE", headers: { apikey: e.NEW_PUB, Authorization: `Bearer ${adminTok}`, "content-type": "application/json" }, body: JSON.stringify({ prefixes: [obj] }) });
  const dj = await r.json().catch(() => []);
  check("E13-admin-delete", r.ok && dj.length === 1, `${b} admin delete ${r.status}`);
  if (r.ok && dj.length === 1) { ledger.objects = ledger.objects.filter((x) => x !== `${b}/${obj}`); saveLedger(); }
}
for (const [who, tok] of [["anon", e.NEW_PUB], ["admin", adminTok]]) {
  r = await fetch(`${e.NEW_URL}/storage/v1/bucket`, { method: "POST", headers: { apikey: e.NEW_PUB, Authorization: `Bearer ${tok}`, "content-type": "application/json" }, body: JSON.stringify({ id: `e2e-${RUN}`, name: `e2e-${RUN}`, public: false }) });
  check("E13-create-bucket", r.status >= 400, `${who} create bucket ${r.status}`);
}
// anon upsert into documents (where the CV lives) is refused: aimed at a test object, not the real CV
const docObj = `e2e/${TAG}-cv.pdf`;
const docUrl = `${e.NEW_URL}/storage/v1/object/public/documents/${docObj}`;
r = await fetch(`${e.NEW_URL}/storage/v1/object/documents/${docObj}`, { method: "POST", headers: { apikey: e.NEW_PUB, Authorization: `Bearer ${adminTok}`, "content-type": "application/pdf" }, body: "%PDF-e2e" });
const cvMd5 = r.ok ? md5(Buffer.from("%PDF-e2e")) : null;
if (cvMd5) {
  ledger.objects.push(`documents/${docObj}`); saveLedger();
  r = await fetch(`${e.NEW_URL}/storage/v1/object/documents/${docObj}`, { method: "POST", headers: { ...anonHeaders(e.NEW_PUB), "content-type": "application/pdf", "x-upsert": "true" }, body: "x" });
  const after = md5(Buffer.from(await (await fetch(docUrl, { cache: "no-store" })).arrayBuffer()));
  check("E13-anon-cv", r.status >= 400 && after === cvMd5, `anon upsert in documents ${r.status}`);
  r = await fetch(`${e.NEW_URL}/storage/v1/object/documents`, { method: "DELETE", headers: { apikey: e.NEW_PUB, Authorization: `Bearer ${adminTok}`, "content-type": "application/json" }, body: JSON.stringify({ prefixes: [docObj] }) });
  if (r.ok) { ledger.objects = ledger.objects.filter((x) => x !== `documents/${docObj}`); saveLedger(); }
} else check("E13-anon-cv", false, "could not create the test object");

// ---- E19 advisors
const allowed = new Set(["public_bucket_allows_listing", "auth_leaked_password_protection", "auth_rls_initplan", "multiple_permissive_policies"]);
const adv = [];
for (const k of ["security", "performance"]) {
  const a = (await mgmt(`/v1/projects/${e.NEW_REF}/advisors/${k}`)).json;
  for (const l of a.lints || []) if (l.level === "ERROR" || !allowed.has(l.name)) adv.push(`${l.level}:${l.name}`);
}
check("E19", adv.length === 0, adv.join(","));

// ---- E24 user gate (admins + test admin)
const users = ((await (await admin("/users?per_page=1000")).json()).users || []).map((u) => u.email.toLowerCase()).sort();
const want = [...e.ADMINS.split(",").map((s) => s.trim().toLowerCase()), e.TEST_ADMIN_EMAIL.toLowerCase()].sort();
check("E24", JSON.stringify(users) === JSON.stringify(want), `users ${users.length}`);

result("probes", fails.length === 0, { fails, cvChecked: Boolean(cvMd5), ledgerLeft: ledger.rows.length + ledger.objects.length });
if (fails.some((f) => f.startsWith("E24"))) { console.error("STOP-ALL: user gate"); process.exit(2); }
