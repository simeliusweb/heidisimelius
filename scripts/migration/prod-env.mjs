// 8.7 (PA_PROD_ENV_SWITCH) / Abort A: point the Production VITE_SUPABASE_* vars at the new or old project.
// A record shared by preview+production is split first (PATCH its target to preview only); it is never
// removed. Takes effect only at the next production build. Values are never printed.
//   node prod-env.mjs --to new | --to old | --show
import { env, result, log } from "./lib.mjs";

const e = env();
const api = (p, opts = {}) =>
  fetch(`https://api.vercel.com${p}${p.includes("?") ? "&" : "?"}teamId=${e.VERCEL_ORG_ID}`, {
    ...opts,
    headers: { Authorization: `Bearer ${e.VERCEL_TOKEN}`, "content-type": "application/json" },
  });
const list = async () => (await (await api(`/v10/projects/${e.VERCEL_PROJECT_ID}/env`)).json()).envs;
const mode = process.argv[2] === "--to" ? process.argv[3] : "show";
const values = {
  new: { VITE_SUPABASE_URL: e.NEW_URL, VITE_SUPABASE_PUBLISHABLE_KEY: e.NEW_PUB },
  old: { VITE_SUPABASE_URL: e.OLD_URL, VITE_SUPABASE_PUBLISHABLE_KEY: e.OLD_ANON },
};

const show = (envs) =>
  envs.filter((x) => x.key.startsWith("VITE_SUPABASE")).map((x) => `${x.key} ${x.type} ${JSON.stringify(x.target)} ${new Date(x.updatedAt).toISOString()}`);

if (mode === "show") {
  console.log(show(await list()).join("\n"));
  process.exit(0);
}
if (!values[mode]) throw new Error("--to new|old");

for (const [key, value] of Object.entries(values[mode])) {
  if (!value) throw new Error(`no ${mode} value for ${key}`);
  let envs = await list();
  const prodOnly = envs.find((x) => x.key === key && x.target.length === 1 && x.target[0] === "production");
  const shared = envs.find((x) => x.key === key && x.target.includes("production") && x.target.length > 1);
  if (shared) {
    const r = await api(`/v9/projects/${e.VERCEL_PROJECT_ID}/env/${shared.id}`, {
      method: "PATCH",
      body: JSON.stringify({ target: shared.target.filter((t) => t !== "production") }),
    });
    if (!r.ok) throw new Error(`split ${key}: ${r.status} ${(await r.text()).slice(0, 200)}`);
    const add = await api(`/v10/projects/${e.VERCEL_PROJECT_ID}/env`, {
      method: "POST",
      body: JSON.stringify({ key, value, type: "encrypted", target: ["production"] }),
    });
    if (!add.ok) {
      // undo the split so Production keeps its previous value
      await api(`/v9/projects/${e.VERCEL_PROJECT_ID}/env/${shared.id}`, { method: "PATCH", body: JSON.stringify({ target: shared.target }) });
      throw new Error(`add ${key}: ${add.status} ${(await add.text()).slice(0, 200)} (split undone)`);
    }
  } else if (prodOnly) {
    const r = await api(`/v9/projects/${e.VERCEL_PROJECT_ID}/env/${prodOnly.id}`, {
      method: "PATCH",
      body: JSON.stringify({ value, type: "encrypted", target: ["production"] }),
    });
    if (!r.ok) throw new Error(`update ${key}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  } else throw new Error(`no production record for ${key}`);
}

// Verify: exactly one production record per key, holding the intended value (read back decrypted, compared
// in memory only), and the preview records still exist.
const envs = await list();
const checks = {};
for (const [key, value] of Object.entries(values[mode])) {
  const prod = envs.filter((x) => x.key === key && x.target.includes("production"));
  const preview = envs.filter((x) => x.key === key && x.target.includes("preview"));
  let valueOk = false;
  if (prod.length === 1) {
    const d = await (await api(`/v1/projects/${e.VERCEL_PROJECT_ID}/env/${prod[0].id}`)).json();
    valueOk = d.value === value;
  }
  checks[key] = { production: prod.length, valueOk, preview: preview.length };
}
const ok = Object.values(checks).every((c) => c.production === 1 && c.valueOk && c.preview >= 1);
log(`prod-env --to ${mode}: ${JSON.stringify(checks)}`);
result("8.7", ok, { to: mode, checks, layout: show(envs) });
