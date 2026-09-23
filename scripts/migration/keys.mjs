// 2B.2k: publishable key, a dedicated secret key for the agent, legacy keys off; 2B.2 user gate #1.
// Also seeds the run identifiers in .env.generated. Idempotent: an existing migration_agent key is reused.
import crypto from "node:crypto";
import { env, mgmt, result, writeGenerated, OLD_URL } from "./lib.mjs";

const e = env();
const base = `/v1/projects/${e.NEW_REF}/api-keys`;
const { status, json: keys } = await mgmt(`${base}?reveal=true`);
if (status !== 200) throw new Error(`api-keys ${status}`);

const pub = keys.find((k) => k.type === "publishable");
let secret = keys.find((k) => k.type === "secret" && k.name === "migration_agent");
if (!secret) {
  const c = await mgmt(`${base}?reveal=true`, { method: "POST", body: { type: "secret", name: "migration_agent" } });
  if (!c.ok) throw new Error(`create secret key ${c.status}`);
  secret = c.json;
}
if (!pub?.api_key?.startsWith("sb_publishable_") || !secret?.api_key?.startsWith("sb_secret_")) {
  throw new Error("expected sb_publishable_/sb_secret_ keys");
}

const gen = {
  OLD_URL,
  OLD_ANON: e.OLD_ANON,
  NEW_URL: `https://${e.NEW_REF}.supabase.co`,
  NEW_PUB: pub.api_key,
  NEW_SECRET: secret.api_key,
  NEW_SECRET_ID: secret.id,
};
if (!e.RUN_ID) gen.RUN_ID = `${new Date().toISOString().slice(0, 10).replace(/-/g, "")}${crypto.randomBytes(2).toString("hex")}`;
if (!e.T0) gen.T0 = "2026-09-23T12:00:00.000Z";
writeGenerated(gen);

// Legacy JWT keys: disable when they are enabled.
const legacy = keys.filter((k) => k.type === "legacy");
let legacyDisabled = "none-listed";
if (legacy.length) {
  const l = await mgmt(`${base}/legacy`);
  if (l.json?.enabled) {
    const d = await mgmt(`${base}/legacy?enabled=false`, { method: "PUT" });
    legacyDisabled = d.ok ? "disabled" : `failed-${d.status}`;
  } else legacyDisabled = "already-disabled";
}
result("2B.2k", true, { publishable: true, secret_id: secret.id, legacy: legacyDisabled });

// 2B.2 user gate #1: zero users.
const g = env();
const r = await fetch(`${g.NEW_URL}/auth/v1/admin/users?per_page=1000`, {
  headers: { apikey: g.NEW_SECRET, Authorization: `Bearer ${g.NEW_SECRET}` },
});
const users = (await r.json()).users ?? [];
result("2B.2", r.status === 200 && users.length === 0, { status: r.status, users: users.length });
if (users.length) {
  console.error("STOP-ALL: unexpected users on the new project");
  process.exit(2);
}
