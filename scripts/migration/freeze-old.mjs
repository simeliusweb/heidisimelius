// A.5: print the freeze/unfreeze SQL for the Lovable SQL editor (run there through the MCP browser),
// and verify the resulting privileges from outside over REST (anon can still read; nothing can write).
//   node freeze-old.mjs --print-freeze | --print-unfreeze | --verify-frozen | --verify-unfrozen
import fs from "node:fs";
import path from "node:path";
import { STATE, TABLES, env, guardFetch, anonHeaders, result } from "./lib.mjs";

const list = TABLES.map((t) => `public.${t}`).join(", ");
const FREEZE = `-- ALLOW-FREEZE (PA_OLD_DB_FREEZE)
revoke insert, update, delete, truncate on ${list} from anon, authenticated;
create policy migration_freeze_ins on storage.objects as restrictive for insert to authenticated with check (false);
create policy migration_freeze_upd on storage.objects as restrictive for update to authenticated using (false) with check (false);
create policy migration_freeze_del on storage.objects as restrictive for delete to authenticated using (false);
select t, has_table_privilege('authenticated', t, 'INSERT') i, has_table_privilege('authenticated', t, 'UPDATE') u,
       has_table_privilege('authenticated', t, 'DELETE') d, has_table_privilege('anon', t, 'SELECT') anon_sel,
       (select count(*) from pg_policies where schemaname = 'storage' and policyname like 'migration_freeze_%') freeze_policies
from unnest(array['public.gigs','public.videos','public.photo_sets','public.page_content']) t;`;

// Unfreeze restores exactly the ACL in the 2A Q1 snapshot (Supabase default: arwdDxtm for anon/authenticated).
function unfreezeSql() {
  const q1 = JSON.parse(fs.readFileSync(path.join(STATE, "artifacts/2A/q1.json"), "utf8"));
  const grants = [];
  for (const t of TABLES) {
    const acl = q1.rls[t].acl;
    for (const role of ["anon", "authenticated"]) {
      const m = acl.match(new RegExp(`${role}=([a-zA-Z]*)/`));
      if (m && m[1].includes("a") && m[1].includes("w") && m[1].includes("d") && m[1].includes("D")) {
        grants.push(`grant insert, update, delete, truncate on public.${t} to ${role};`);
      }
    }
  }
  return `-- ALLOW-FREEZE (unfreeze; PA_OLD_DB_FREEZE)
${grants.join("\n")}
drop policy if exists migration_freeze_ins on storage.objects;
drop policy if exists migration_freeze_upd on storage.objects;
drop policy if exists migration_freeze_del on storage.objects;
select c.relname, c.relacl::text acl from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' order by 1;`;
}

const mode = process.argv[2];
if (mode === "--print-freeze") console.log(FREEZE);
else if (mode === "--print-unfreeze") console.log(unfreezeSql());
else if (mode === "--verify-frozen" || mode === "--verify-unfrozen") {
  // From outside only reads are checked (R4: no writes to the old ref, not even probes). The write
  // privileges themselves are verified by the SELECT at the end of the freeze SQL.
  const e = env();
  const reads = [];
  for (const t of TABLES) {
    const r = await guardFetch(`${e.OLD_URL}/rest/v1/${t}?select=*&limit=1`, { headers: anonHeaders(e.OLD_ANON) });
    reads.push(r.status);
  }
  result(mode === "--verify-frozen" ? "8.1-verify-reads" : "unfreeze-verify-reads", reads.every((s) => s === 200), { reads });
  console.log("privilege checks run in the Lovable SQL editor (has_table_privilege), see the printed SQL");
} else {
  console.error("usage: freeze-old.mjs --print-freeze | --print-unfreeze | --verify-frozen | --verify-unfrozen");
  process.exit(2);
}
