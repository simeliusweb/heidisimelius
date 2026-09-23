// 2B.6: recreate the 2 CMS admins with their current passwords + the E2E test admin, all with
// app_metadata.cms_admin=true; verify sign-in and the JWT claim. 2B.7 / E24: user gate.
// Idempotent: looks users up by email first. Passwords are never printed.
//   node users.mjs            create/verify + gate {admins, test admin}
//   node users.mjs --gate     gate only (expects {admins, test admin})
//   node users.mjs --gate-admins-only
//   node users.mjs --delete-test-admin
import crypto from "node:crypto";
import { env, result, writeGenerated } from "./lib.mjs";

let e = env();
const admin = (p, opts = {}) =>
  fetch(`${e.NEW_URL}/auth/v1/admin${p}`, {
    ...opts,
    headers: { apikey: e.NEW_SECRET, Authorization: `Bearer ${e.NEW_SECRET}`, "content-type": "application/json" },
  });

async function listUsers() {
  const r = await admin("/users?per_page=1000");
  if (r.status === 401) throw new Error("STOP-ALL: 401 from the secret key");
  return (await r.json()).users ?? [];
}

const adminEmails = e.ADMINS.split(",").map((s) => s.trim().toLowerCase());
const passwordFor = (email) =>
  email === String(e.CMS_ACCOUNT).toLowerCase() ? e.CMS_ACCOUNT_PASSWORD : email === "simelius.heidi@gmail.com" ? e.HEIDI_CMS_PASSWORD : undefined;

async function gate(expected, id) {
  const users = await listUsers();
  const got = users.map((u) => u.email.toLowerCase()).sort();
  const want = [...expected].sort();
  const anon = users.filter((u) => u.is_anonymous).length;
  const ok = JSON.stringify(got) === JSON.stringify(want) && anon === 0;
  result(id, ok, { users: got.length, expected: want.length, anonymous: anon, unexpected: got.filter((x) => !want.includes(x)) });
  if (!ok) {
    console.error("STOP-ALL: user gate mismatch");
    process.exit(2);
  }
}

async function ensureUser(email, password) {
  const existing = (await listUsers()).find((u) => u.email.toLowerCase() === email);
  if (existing) {
    if (existing.app_metadata?.cms_admin !== true) {
      await admin(`/users/${existing.id}`, { method: "PUT", body: JSON.stringify({ app_metadata: { cms_admin: true } }) });
    }
    return { id: existing.id, created: false };
  }
  const r = await admin("/users", {
    method: "POST",
    body: JSON.stringify({ email, password, email_confirm: true, app_metadata: { cms_admin: true } }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`create user failed ${r.status} ${j.msg || j.error_code || ""}`);
  return { id: j.id, created: true };
}

async function signInClaim(email, password) {
  const r = await fetch(`${e.NEW_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: e.NEW_PUB, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  if (r.status !== 200) return { status: r.status, claim: false };
  const payload = JSON.parse(Buffer.from(j.access_token.split(".")[1], "base64url").toString());
  // No logout: signOut is global and would end Heidi's real sessions. The refresh token just expires.
  return { status: 200, claim: payload.app_metadata?.cms_admin === true };
}

const arg = process.argv[2];
const testEmail = () => env().TEST_ADMIN_EMAIL?.toLowerCase();

if (arg === "--gate") await gate([...adminEmails, testEmail()], "E24");
else if (arg === "--gate-admins-only") await gate(adminEmails, "E24-admins");
else if (arg === "--delete-test-admin") {
  const u = (await listUsers()).find((x) => x.email.toLowerCase() === testEmail());
  if (u) await admin(`/users/${u.id}`, { method: "DELETE" });
  result("14.6-user", true, { deleted: Boolean(u) });
} else {
  const out = {};
  for (const email of adminEmails) {
    const pw = passwordFor(email);
    if (!pw) throw new Error(`no password known for admin #${adminEmails.indexOf(email) + 1}`);
    const u = await ensureUser(email, pw);
    const s = await signInClaim(email, pw);
    out[email.split("@")[0].slice(0, 4) + "…"] = { created: u.created, signin: s.status, claim: s.claim };
  }
  if (!e.TEST_ADMIN_EMAIL) {
    writeGenerated({
      TEST_ADMIN_EMAIL: `simeliusweb+e2e-${e.RUN_ID}@gmail.com`,
      TEST_ADMIN_PASSWORD: crypto.randomBytes(18).toString("base64url").slice(0, 24),
    });
    e = env();
  }
  const t = await ensureUser(e.TEST_ADMIN_EMAIL, e.TEST_ADMIN_PASSWORD);
  if (!e.TEST_ADMIN_ID) writeGenerated({ TEST_ADMIN_ID: t.id });
  const ts = await signInClaim(e.TEST_ADMIN_EMAIL, e.TEST_ADMIN_PASSWORD);
  out.test_admin = { created: t.created, signin: ts.status, claim: ts.claim };
  const ok = Object.values(out).every((v) => v.signin === 200 && v.claim);
  result("2B.6", ok, out);
  await gate([...adminEmails, e.TEST_ADMIN_EMAIL.toLowerCase()], "2B.7");
}
