// 2B.3: build the schema on the new project from supabase/migrations, as two transactions.
//   Script P: the 6 public migrations + ticket columns + Data API grants.
//   Script S: the 4 storage migrations + the cms_admin claim policies (tables and storage, so it must
//             run after the storage policies exist) + the migration-history insert.
// Idempotent: each script is skipped when its end state is already present.
import fs from "node:fs";
import path from "node:path";
import { REPO, sbq, result, setStep } from "./lib.mjs";

const dir = path.join(REPO, "supabase/migrations");
const read = (v) => {
  const f = fs.readdirSync(dir).find((n) => n.startsWith(`${v}_`));
  if (!f) throw new Error(`migration ${v} not found`);
  return `-- >>> ${f}\n${fs.readFileSync(path.join(dir, f), "utf8")}\n`;
};

const PUBLIC = ["20251010104232", "20251011061316", "20251013093859", "20251013151256", "20251013151748", "20251013171304", "20260923120000", "20260923120100"];
const STORAGE = ["20251011064909", "20251013161846", "20251014072133", "20251014102553", "20260923120200"];
const HISTORY = `
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);
insert into supabase_migrations.schema_migrations(version, name) values
 ('20251010104232','f6121ef5-b0f6-46dd-b599-187a45a8cae0'),('20251011061316','841c1b92-4512-4fa8-ba19-8e2f0eb6b1b9'),
 ('20251011064909','714329e9-23aa-4323-94a7-ca8b5e6a5480'),('20251013093859','26967c2f-9540-43bf-b9b3-aa18f733e6a4'),
 ('20251013151256','014ca8ac-f2ff-4e3e-8dcb-80136833f39f'),('20251013151748','0453cc45-c4d9-461b-b6af-9c06ae4093f3'),
 ('20251013161846','24b310e9-dda3-4965-8b56-449503fde728'),('20251013171304','50c8eb44-5192-4c5b-899b-1bb95b9324c8'),
 ('20251014072133','4a299cc6-9a1a-46e5-89a7-eb8fa2ce1f01'),('20251014102553','0165d490-1f36-49c7-989a-92c6903bfc0b'),
 ('20260923120000','add_gig_ticket_price_and_duration'),('20260923120100','grant_data_api_roles'),
 ('20260923120200','cms_admin_claim')
on conflict (version) do nothing;
`;

const [{ has_public, has_storage }] = await sbq(`
  select to_regclass('public.gigs') is not null
           and exists (select 1 from information_schema.columns where table_schema='public' and table_name='gigs' and column_name='ticket_price')
           and has_table_privilege('anon','public.gigs','SELECT') as has_public,
         to_regclass('supabase_migrations.schema_migrations') is not null
           and exists (select 1 from storage.buckets where id='images') as has_storage`);

if (has_public) result("2B.3-P", "skipped", { reason: "public schema present" });
else {
  await sbq(`begin;\n${PUBLIC.map(read).join("\n")}\ncommit;`);
  result("2B.3-P", true, { migrations: PUBLIC.length });
}

let storageDone = has_storage;
if (has_storage) {
  const [{ n }] = await sbq(`select count(*)::int n from supabase_migrations.schema_migrations where version='20260923120200'`);
  storageDone = n === 1;
}
if (storageDone) result("2B.3-S", "skipped", { reason: "storage schema + history present" });
else {
  await sbq(`begin;\n${STORAGE.map(read).join("\n")}\n${HISTORY}\ncommit;`);
  result("2B.3-S", true, { migrations: STORAGE.length });
}
setStep("2B.3", "done");
