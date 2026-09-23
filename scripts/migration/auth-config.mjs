// 2B.0 org/region check + 2B.1 auth lockdown (PATCH, then GET to verify). Idempotent.
import { env, mgmt, result, setStep } from "./lib.mjs";

const e = env();
const { status, json: p } = await mgmt(`/v1/projects/${e.NEW_REF}`);
const orgOk = status === 200 && (p.organization_id === e.SUPABASE_ORG_SLUG || p.organization_slug === e.SUPABASE_ORG_SLUG);
if (!orgOk || p.name !== "heidisimeliusfi" || p.region !== "eu-north-1") {
  result("2B.0", false, { status, name: p?.name, region: p?.region, orgOk });
  console.error("STOP-ALL: the new project is not the expected simeliusweb project");
  process.exit(2);
}
result("2B.0", true, { name: p.name, region: p.region, status: p.status });

const passwords = [e.CMS_ACCOUNT_PASSWORD, e.HEIDI_CMS_PASSWORD].filter(Boolean);
if (passwords.length !== 2) throw new Error("both admin passwords must be present");
const minLen = Math.min(12, ...passwords.map((pw) => pw.length));

const want = {
  disable_signup: true,
  external_anonymous_users_enabled: false,
  external_email_enabled: true,
  mailer_autoconfirm: false,
  security_manual_linking_enabled: false,
  site_url: "https://www.heidisimelius.fi",
  uri_allow_list: "https://www.heidisimelius.fi/**,https://heidisimelius.fi/**,http://localhost:8080/**,http://localhost:4173/**",
  refresh_token_rotation_enabled: true,
  jwt_exp: 3600,
  password_min_length: minLen,
  ...(e.D1 === "pro" ? { password_hibp_enabled: true } : {}),
};

const patch = await mgmt(`/v1/projects/${e.NEW_REF}/config/auth`, { method: "PATCH", body: want });
if (!patch.ok) {
  result("2B.1", false, { patch: patch.status, body: JSON.stringify(patch.json).slice(0, 300) });
  process.exit(2);
}
const { json: got } = await mgmt(`/v1/projects/${e.NEW_REF}/config/auth`);
const mismatch = Object.keys(want).filter((k) => got[k] !== want[k]);
setStep("2B.1", mismatch.length ? "halted" : "done", { password_min_length: minLen });
result("2B.1", mismatch.length === 0, { mismatch, password_min_length: minLen });
if (mismatch.length) {
  console.error("STOP-ALL: auth config does not match after PATCH");
  process.exit(2);
}
