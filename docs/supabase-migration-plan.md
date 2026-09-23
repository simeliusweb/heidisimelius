# Migrate the backend from Lovable Cloud to our own Supabase project

**Status:** 📝 Draft v1, waiting for audit. Nothing has been changed yet.
**Date:** 2026-09-23
**Source:** 5 read-only planning passes: database, storage and auth, Lovable exit research, code and cutover, end-to-end testing. Every number below was measured on 2026-09-23 with read-only GETs against production and the public REST and storage APIs.

---

## 1. Why

The site's database, storage and auth run on **Lovable Cloud**: a Supabase project that Lovable manages. Its ref is `yctdrwogilljanzxcgow`, the Lovable project is "heidi-web-forge", and the database is in AWS eu-west-2 (London). Lovable never gives out the database password, the connection string or the service-role key. So we have no credentials of our own, and we can only reach the backend through Lovable's UI.

**The goal:** move everything into a Supabase project in an org we control (the `simeliusweb` org, which is currently empty). The site must behave the same afterwards, with zero downtime for visitors and no content lost. Then shut down Lovable Cloud cleanly. Every credential goes into a password manager this time.

## 2. What we're moving (all measured)

| Item | Size | Notes |
|---|---|---|
| `gigs` | 41 rows | 7 upcoming, 34 past; 13 `gig_group_id` groups |
| `videos` | 10 rows | 8 Musavideot + 2 Muut videot; each section has its own `order_index` |
| `photo_sets` | 6 rows | 1 press kit (3 photos + zip), 5 galleries |
| `page_content` | 3 rows | `bio`, `laulunopetus`, `page_images` (JSON) |
| Storage | 75 objects, ~41.9 MB, 4 **public** buckets | `images` 13, `documents` 1 (CV), `photo_sets_images` 37 (incl. the 6.9 MB press-kit zip), `gigs-images` 24. The DB references 54 of them. The other 21 are orphans, because the CMS never deletes files. |
| Old-host URLs in the DB | **62** | `gigs.image_url` 18, `photo_sets.photos` 34, `photo_sets.press_kit_zip_url` 1, `page_content.content` 9. All are full `https://yctdrwogilljanzxcgow.supabase.co/storage/v1/object/public/...` URLs. |
| Auth | email + password only | `disable_signup: true`, no OAuth, no anonymous users. The app only calls `signInWithPassword` and `signOut`. |
| Edge function `keep-db-alive` | deployed on Lovable | No longer needed: `api/keep-db-alive.ts` (Vercel cron) replaces it. |
| Schema | 10 migrations in `supabase/migrations/` | `types.ts` matches the migrations and the live REST columns. Lovable-side drift (triggers, grants, cron jobs) still has to be checked (§6.1). |

**Anon can read everything.** All 4 tables have `USING (true)` SELECT, and all 4 buckets are public and listable. That means the data and files can be exported and checked **without any Lovable credentials**.

## 3. Critical findings that shape the plan

1. **🔴 Any logged-in user is an admin.** Every table has a FOR ALL policy with `auth.uid() IS NOT NULL`, and the storage write policies use `TO authenticated`. Right now the only thing protecting the CMS is `disable_signup: true`. **New Supabase projects allow signups by default.** So the first thing we do on the new project, before any data goes in, is turn off "Allow new users to sign up" and anonymous sign-ins. We keep the policies as they are during the migration, and tighten them afterwards (§11).
2. **🔴 Production doesn't run the current code.** Production is `main` at `fd4ce94`. The GSC/SEO work (the fixed keep-alive cron — production's cron has hit a 404 for about 11 months — the real 404s, canonicals, redirects and `noindex` headers) is committed on `main` but **not pushed yet**, so it isn't deployed. A new free-tier project pauses after 7 idle days, so **`main` must be live in production before cutover**. That also makes production a clean "before" baseline.
3. **🟠 Lovable still pushes to `main`.** It has made 320 bot commits, the last on 2025-10-15. `main` deploys straight to production, and there's no branch protection. If anyone prompts the Lovable agent (for example to help export), it can commit a regenerated `client.ts` or `.env`. **Disconnect Lovable's GitHub access before doing anything in Lovable.**
4. **🟠 API key format.** New Supabase projects only issue `sb_publishable_…` / `sb_secret_…` keys. Supabase's docs say these go in the `apikey` header and are **not** valid as `Authorization: Bearer`. Two places send the key as Bearer: `api/keep-db-alive.ts:29`, and supabase-js 2.75 on anonymous requests (this needs checking). **Mitigation:** upgrade supabase-js, send only `apikey` from keep-alive, and treat "the preview loads its data with the new key" as a hard pass/fail check before cutover (§8, test A1).
5. **🟠 Old-host URLs are stored in the DB.** Without a rewrite, the site would *look* fine after cutover but still load all its media from Lovable, and break the day Lovable is removed. The rewrite plus a zero-match check is mandatory (§6.4).
6. **🟠 The Lovable credit balance.** If the workspace runs out of credits, Lovable **pauses the backend**, and the live site stops loading data. Check the balance before starting (§5).
7. **🟡 The GitHub repo is public.** DB exports, backups and credentials must never go in it. That includes this plan, which contains no secrets.
8. **🟡 A pending schema change.** Gig ticket price and show length (for the Event structured data Google flags) are on `main`, but **switched off** (`GIG_TICKET_FIELDS_ENABLED = false`), because the live Lovable DB doesn't have the columns. The migration is **not** in `supabase/migrations/`. It lives only in this plan (§6.2a) and is applied to the new project only. Everything else that was in flight is committed on `main`.

## 4. Target setup

| Setting | Value |
|---|---|
| Org | `simeliusweb` (Supabase). Owner #1 = the owner's login. Owner #2 (backup) = the developer. Both accounts use MFA with **two** TOTP devices, because Supabase has no recovery codes. |
| Region | **eu-north-1 (Stockholm).** It's closer to Finland than London, and it's in the EU. Second choice: eu-central-1. |
| Postgres | 17 (the platform default) |
| Plan | **Decision D1:** Free, or Pro at $25/mo. Free pauses after 7 idle days and has no backups. Pro never pauses and keeps 7 days of backups. Either way we keep an off-site backup (§10). |
| Auth | Email provider only. **Signups OFF, anonymous OFF.** "Confirm email" on. Site URL `https://www.heidisimelius.fi`. Redirect URLs: `https://www.heidisimelius.fi/**`, `https://heidisimelius.fi/**`, `http://localhost:8080/**`, `https://*-simeliuswebs-projects.vercel.app/**` |
| Keys | `sb_publishable_…` goes in `VITE_SUPABASE_PUBLISHABLE_KEY` (the variable name stays the same). `sb_secret_…` is used only for the one-off storage copy script, never with a `VITE_` prefix, and never in `.env`. |
| Credential custody | One password-manager entry, shared by the owner and the developer. It holds: Supabase logins + MFA, org + project ref, region, DB password, direct and pooler connection strings, project URL, publishable and secret keys, the CMS admin email and password, and where each value is used (which Vercel env var, which backup secret). Review it once a year. **This gap is what caused the current problem.** |

## 5. Phase 0: prerequisites (no Supabase changes yet)

- [ ] **0.1 Settle the in-flight work.** Push `main` so the committed work deploys to production. Check on production that the cron endpoint answers (401 without the secret, 200 with it), that 404s are real, and that canonicals are present. Leave `GIG_TICKET_FIELDS_ENABLED` **false**: the columns go into the new project's schema from day one (§6.2a), and the fields get switched on only after cutover (§9 step 9).
- [ ] **0.2 Code freeze** on `main` for the migration window. Only migration work lands.
- [ ] **0.3 Set up credential custody** (§4) *before* any credential exists.
- [ ] **0.4 Lock Lovable out of `main`:**
  - In Lovable: Project settings → GitHub → **Disconnect**. The Lovable project and Cloud stay.
  - On GitHub: remove the Lovable (gpt-engineer) app's access to the repo on the `simeliusweb` account, at github.com/settings/installations.
  - Add branch protection on `main` that requires a PR.
- [ ] **0.5 Check Lovable's workspace plan and credit balance** (Settings → Plans & credits). There must be enough to keep Cloud running through the whole fallback window (about 4 weeks after cutover).
- [ ] **0.6 Answer the decisions in §12.**

## 6. Phase 1–3: record, build, rehearse

### 6.1 Record the source (Lovable UI + SQL editor, read-only)

**Screenshots and copies go to the private vault, never the repo:**
- Cloud → Overview: region, instance, and the Advanced settings page.
- Secrets: names and dates. Values can't be read.
- **Jobs**: disable any job that calls `keep-db-alive`.
- **Emails**: is a sender domain set up? None is expected, because `notify.heidisimelius.fi` has no NS record.
- **Edge functions**: the list and invocation counts.
- Usage: monthly credit burn.
- Connectors and Security findings.
- Settings: GitHub, Domains, Collaborators.

**SQL editor queries** (each block is one read-only statement; save the output):

```sql
-- A1: schema snapshot as one JSON cell (run again on the new project later and diff)
select jsonb_pretty(jsonb_build_object(
 'whoami', jsonb_build_object('user',current_user,'version',version(),'tz',current_setting('TimeZone')),
 'columns', (select jsonb_agg(jsonb_build_object('t',table_name,'pos',ordinal_position,'col',column_name,'type',udt_name,'null',is_nullable,'default',column_default) order by table_name,ordinal_position) from information_schema.columns where table_schema='public'),
 'enums', (select jsonb_object_agg(t.typname,(select jsonb_agg(e.enumlabel order by e.enumsortorder) from pg_enum e where e.enumtypid=t.oid)) from pg_type t where t.typnamespace='public'::regnamespace and t.typtype='e'),
 'constraints', (select jsonb_agg(jsonb_build_object('t',conrelid::regclass::text,'name',conname,'def',pg_get_constraintdef(oid)) order by conrelid::regclass::text,conname) from pg_constraint where connamespace='public'::regnamespace),
 'indexes', (select jsonb_agg(indexdef order by indexname) from pg_indexes where schemaname='public'),
 'rls', (select jsonb_object_agg(relname,jsonb_build_object('on',relrowsecurity,'forced',relforcerowsecurity,'acl',relacl::text)) from pg_class where relnamespace='public'::regnamespace and relkind in ('r','p','v','m')),
 'policies', (select jsonb_agg(jsonb_build_object('s',schemaname,'t',tablename,'name',policyname,'perm',permissive,'roles',roles,'cmd',cmd,'using',qual,'check',with_check) order by schemaname,tablename,policyname) from pg_policies where schemaname in ('public','storage')),
 'functions', (select jsonb_agg(jsonb_build_object('name',p.proname,'def',pg_get_functiondef(p.oid))) from pg_proc p where p.pronamespace='public'::regnamespace and p.prokind in ('f','p')),
 'triggers', (select jsonb_agg(jsonb_build_object('t',c.oid::regclass::text,'name',t.tgname,'def',pg_get_triggerdef(t.oid))) from pg_trigger t join pg_class c on c.oid=t.tgrelid where not t.tgisinternal and c.relnamespace in ('public'::regnamespace,'auth'::regnamespace)),
 'extensions', (select jsonb_agg(extname||' '||extversion order by extname) from pg_extension),
 'buckets', (select jsonb_agg(jsonb_build_object('id',id,'public',public,'size_limit',file_size_limit,'mime',allowed_mime_types) order by id) from storage.buckets),
 'objects', (select jsonb_object_agg(bucket_id,jsonb_build_object('n',n,'bytes',b)) from (select bucket_id,count(*) n,sum((metadata->>'size')::bigint) b from storage.objects group by 1) o)
));
-- If one line fails with a permission error, delete it and note it: that means the editor role is restricted.

-- A2: drift that types.ts can't show (run each on its own; an error means the schema isn't there)
select version, name from supabase_migrations.schema_migrations order by version;   -- more than 10 = drift
select jobid, jobname, schedule, active, left(command,200) from cron.job;           -- any row = drift
select * from pg_publication_tables;                                                -- Realtime

-- A3: auth users (no password hashes)
select id, email, created_at, last_sign_in_at, email_confirmed_at is not null as confirmed,
       raw_app_meta_data->>'provider' as provider
from auth.users order by created_at;

-- A4: data checksums (run the same query on the new project)
select 'gigs' tbl, count(*), md5(string_agg(to_jsonb(t)::text, E'\n' order by id)) from public.gigs t
union all select 'videos', count(*), md5(string_agg(to_jsonb(t)::text, E'\n' order by id)) from public.videos t
union all select 'photo_sets', count(*), md5(string_agg(to_jsonb(t)::text, E'\n' order by id)) from public.photo_sets t
union all select 'page_content', count(*), md5(string_agg(to_jsonb(t)::text, E'\n' order by page_name)) from public.page_content t;
-- Both sides must use TimeZone=UTC (see A1 whoami) so timestamptz renders the same way.
```

**Archive copy:** Cloud → Overview → Advanced settings → **Export project data**. This produces a `.backup` file in pg_restore format, and the download link arrives by email.
- Download it into the vault. We don't import from it (see §6.3), but it's the complete fallback copy.
- It also settles questions about drift: `brew install libpq`, then `pg_restore -l file.backup` shows the source Postgres version and every object.
- Exports can't be downloaded once Cloud is removed, and you can make only one every 24 hours.

**Baseline B0/B1:** run the capture script (§8.2) against production. Once 0.1 is done, production *is* the release code.

### 6.2 Build the target (owner's Supabase dashboard)

1. Create the project in `simeliusweb`, region eu-north-1. Store the DB password in the vault right away.
2. **Right away:** Authentication → turn signups OFF and anonymous sign-ins OFF, and set the Site URL and redirect URLs (§4).
3. **Schema:** in the SQL editor, paste the 10 migration files in filename order as one `begin; … commit;` script. Then add:
   - the gig ticket-price/duration migration from **§6.2a**. Its columns are additive and nullable, and the current code doesn't send them while the flag is off. Also commit it as `supabase/migrations/20260923120000_add_gig_ticket_price_and_duration.sql` at that point, so the repo's migrations match the new project.
   - anything A1/A2 found that the migrations don't have.

   **Do not use the `supabase` CLI or MCP on this machine.** They're logged into another client's account.
4. **Grants:** newer projects may not auto-grant privileges on `public` tables to the Data API roles. Compare `rls.acl` from A1 on both projects. If `anon` or `authenticated` is missing, run:
   ```sql
   grant usage on schema public to anon, authenticated;
   grant select on public.gigs, public.videos, public.photo_sets, public.page_content to anon, authenticated;
   grant insert, update, delete on public.gigs, public.videos, public.photo_sets, public.page_content to authenticated;
   ```
5. **Buckets and storage policies** come from the four storage migrations. If `CREATE POLICY` on `storage.objects` fails on ownership, create the 16 policies in Storage → Policies instead.
6. Run A1 on the new project and diff it against the source. The only expected differences are `whoami`, `objects`, `extensions`, and the two new gig columns.
7. **Admin user:** Authentication → Users → Add user, with auto-confirm on.
   - Nothing references user IDs, so a new UUID is harmless. Don't copy password hashes.
   - Recreate each user A3 shows (decision D4).
   - Also create a separate **test admin** for the E2E CMS write tests. Delete it after the migration.

### 6.2a Pending schema change: gig ticket price and show length

**Why:** Search Console flags every gig's Event structured data for missing `offers.price` / `offers.priceCurrency`, and `endDate` currently falls back to a fixed 2 hours. Two optional columns fix both. The code is already on `main` (`src/lib/eventStructuredData.ts`, `src/components/admin/GigTicketFields.tsx`, `gigTicketFieldsSchema.ts`), switched off with `GIG_TICKET_FIELDS_ENABLED = false`.

**Rule:** apply this **only to the new project** (§6.2 step 3), never to Lovable Cloud. It's additive and nullable, so the §6.3 import, the A4 checksums (with the two columns dropped) and the cutover all work with it in place and the flag off.

```sql
-- Search Console flags every gig's Event structured data for missing offers.price /
-- priceCurrency and endDate. Both columns are optional: gigs without them still render,
-- they just keep the warning (price) or fall back to a 2 h duration (endDate).
ALTER TABLE public.gigs
  ADD COLUMN ticket_price numeric(8, 2) CHECK (ticket_price >= 0),
  ADD COLUMN duration_minutes smallint CHECK (duration_minutes > 0);

COMMENT ON COLUMN public.gigs.ticket_price IS 'Cheapest ticket in EUR (0 = free entry). Emitted as offers.price.';
COMMENT ON COLUMN public.gigs.duration_minutes IS 'Show length incl. intermission. Used for the Event endDate.';
```

**Verify right after applying** (new project, SQL editor):
```sql
select column_name, data_type, numeric_precision, numeric_scale, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'gigs' and column_name in ('ticket_price', 'duration_minutes');
-- expected: ticket_price numeric(8,2) YES, duration_minutes smallint YES

select conname, pg_get_constraintdef(oid) from pg_constraint
where conrelid = 'public.gigs'::regclass and (conname like '%ticket_price%' or conname like '%duration_minutes%');
-- expected: CHECK (ticket_price >= 0) and CHECK (duration_minutes > 0)
```

**Switching it on** (cutover step 9, after the POST tests pass):
1. Regenerate `src/integrations/supabase/types.ts` from the new project (§10). It should gain exactly the two columns on `gigs`.
2. Set `GIG_TICKET_FIELDS_ENABLED = true` in `src/components/admin/gigTicketFieldsSchema.ts`.
3. `npx tsc --noEmit -p tsconfig.app.json`, `npm run lint` and `npm run build` pass. Commit on `main` and deploy.
4. Run G1–G6.

**Tests once it's on (run on production, with the test admin; prefix test gigs `E2E-TESTI-`):**

| ID | Test | Expected | How |
|---|---|---|---|
| G1 | Fields show | The add and edit gig dialogs show "Lipun hinta alkaen (€)" and "Kesto (min)". Both are optional. | PW |
| G2 | Validation | `25e`, `-5` and `1,234` are rejected for the price; `0` and `abc` for the duration. Finnish error messages show and nothing is sent. `24,90` and `0` are accepted as prices. | PW |
| G3 | Save round-trip | Create a test gig with 2 performances, price `24,90` and duration `150`. Both rows in the DB have `ticket_price = 24.90` and `duration_minutes = 150`. Reopening edit shows `24,90` and `150`. Clearing both and saving stores NULL. | PW + SQL |
| G4 | Existing gigs still save | Edit an existing gig (NULL in both columns) without touching the new fields. It saves, and both columns stay NULL. | PW |
| G5 | Event JSON-LD on `/keikat` | For the G3 gig: `offers.price = 24.9`, `offers.priceCurrency = "EUR"`, and `endDate = startDate + 150 min`. With price `0`: `isAccessibleForFree: true`. Without a price: no `price`/`priceCurrency`, and `endDate = startDate + 2 h`. | PW |
| G6 | Google | Rich Results Test on `/keikat`: 0 errors and no price warning for the gigs that have a price. Then fill in prices and durations for the real upcoming gigs, and click **Validate fix** in GSC → Enhancements → Events. Watch it for 2 weeks. | Manual |

Delete the test gigs afterwards (B15 cleanup).

### 6.3 Data transfer (rehearsal now, repeated at cutover)

**Method:** export over REST with the anon key, then import in one transaction. This is scriptable, doesn't truncate anything, and is checked with checksums.
- **Fallback:** `pg_restore --data-only --schema=public` from the official export, using the session pooler connection string.
- **Last resort:** the Lovable Database tab's CSV export. It loses jsonb and enum fidelity.

```bash
# B3 export — GET only, written to the scratchpad (never the repo)
for t in gigs videos photo_sets; do curl -s "$OLD_URL/rest/v1/$t?select=*&order=id" -H "apikey: $OLD_ANON" > $t.json; done
curl -s "$OLD_URL/rest/v1/page_content?select=*&order=page_name" -H "apikey: $OLD_ANON" > page_content.json
```

```sql
-- B4 import (seed.sql is generated from the 4 files; the generator must check that no payload contains the string $j$)
begin;
truncate public.gigs, public.videos, public.photo_sets, public.page_content;   -- no FKs, so this is safe to repeat
insert into public.gigs         select * from jsonb_populate_recordset(null::public.gigs,         $j$<gigs.json>$j$::jsonb);
insert into public.videos       select * from jsonb_populate_recordset(null::public.videos,       $j$<videos.json>$j$::jsonb);
insert into public.photo_sets   select * from jsonb_populate_recordset(null::public.photo_sets,   $j$<photo_sets.json>$j$::jsonb);
insert into public.page_content select * from jsonb_populate_recordset(null::public.page_content, $j$<page_content.json>$j$::jsonb);
commit;
```
- `id`, `created_at`, `updated_at` and `order_index` are all carried over explicitly.
- The PKs are UUIDs or text, so there are no sequences to reset.
- The new `ticket_price` and `duration_minutes` columns stay NULL.

**Verify:** A4 on the new project must match the source in all 4 counts and md5s. The md5 must leave out the two new NULL columns (drop them with `to_jsonb(t) - 'ticket_price' - 'duration_minutes'`), because they aren't in the source.

### 6.4 Storage copy and URL rewrite

**Copy script** (`scripts/migration/copy-storage.mjs`, kept out of the commit; run with `node --env-file=<vault-exported file>`):
- It lists every bucket through the old project's public API, paging recursively. Folders come back with `id === null`.
- It downloads each object from the old public URL and checks its size.
- It uploads each object to the new project with the secret key, keeping the **same path**, the same `contentType`, and the same `cacheControl` from the object metadata.
- It is idempotent: it skips objects already present with the same size, but **always** re-copies the CV at `documents/cv/CV-Simelius-Heidi.pdf`, because the CMS overwrites it in place.
- `--verify-only` re-downloads every object from the new public URL and compares count, bytes, sha256 and Content-Type against the old copy. It exits non-zero on any mismatch.
- Copy all 75 objects, orphans included (decision D6).
- If listing is ever blocked, feed it `select bucket_id,name,metadata from storage.objects` from the Lovable SQL editor instead.

A full code sketch came out of the planning pass; it will be written out when we implement.

**URL rewrite** (new DB, only after `--verify-only` passes; paths are unchanged, so only the host changes):
```sql
begin;
-- OLD = 'https://yctdrwogilljanzxcgow.supabase.co/storage/v1/object/public/'
-- NEW = 'https://<newref>.supabase.co/storage/v1/object/public/'   (the dashboard has no psql vars; paste literals)
update public.gigs set image_url = replace(image_url, OLD, NEW) where image_url like '%yctdrwogilljanzxcgow%';
update public.photo_sets set photos = replace(photos::text, OLD, NEW)::jsonb,
       press_kit_zip_url = replace(press_kit_zip_url, OLD, NEW)
 where photos::text like '%yctdrwogilljanzxcgow%' or press_kit_zip_url like '%yctdrwogilljanzxcgow%';
update public.page_content set content = replace(content::text, OLD, NEW)::jsonb where content::text like '%yctdrwogilljanzxcgow%';
commit;
-- expected rows touched: gigs 18, photo_sets ≤6, page_content 2 (page_images, bio). updated_at is deliberately left as it was.
select (select count(*) from gigs where image_url like '%yctdrwogilljanzxcgow%')
     + (select count(*) from photo_sets where photos::text like '%yctdrwogilljanzxcgow%' or press_kit_zip_url like '%yctdrwogilljanzxcgow%')
     + (select count(*) from page_content where content::text like '%yctdrwogilljanzxcgow%')
     + (select count(*) from videos where url like '%yctdrwogilljanzxcgow%') as remaining;   -- must be 0
```
- **Verify:** send a HEAD request to each of the 54 unique rewritten URLs. Every one must return 200 from the new host.
- A4 on the new project must equal A4 on the source run with `replace(to_jsonb(t)::text, OLD, NEW)`. This proves the rewrite changed only the host.

**SEO impact of the image URL change: minimal.**
- Supabase serves storage with `x-robots-tag: none`, so these images were never in Google Images.
- `og:image` points to a file on our own domain.
- The sitemap has no image entries.
- The only visible change: the gig Event JSON-LD `image` field gets the new host on the next crawl.
- The real exposure is **outside deep links** to the old press-kit zip or CV URL. Those break when Lovable is removed, which is another reason for the 4-week fallback window. The optional `/media` proxy (decision D5) would stop this happening again in any future move.

## 7. Phase 4: migration branch and preview rehearsal

**Branch `chore/supabase-migration`** (from `main` after 0.1). The code changes:

| File | Change |
|---|---|
| `supabase/config.toml` | `project_id` → new ref; delete the `[functions.keep-db-alive]` block |
| `supabase/functions/keep-db-alive/` | delete |
| `api/keep-db-alive.ts:28-29` | send only the `apikey` header (works with both legacy and `sb_publishable_` keys) |
| `package.json` | upgrade `@supabase/supabase-js` to latest 2.x (publishable-key handling) |
| `.env.example` | remove `SUPABASE_FUNCTION_URL`; add `CRON_SECRET=` |
| `e2e/`, `playwright.config.ts`, `scripts/baseline/` | the test suite (§8.4) |
| `CLAUDE.md` | env list (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `BREVO_API_KEY`, `CRON_SECRET`); project ownership; "Lovable disconnected"; how to run the CLI with the owner token |
| optional | remove `lovable-tagger` (`vite.config.ts:5,146`, `package.json`, both lockfiles) |

- **No app code changes** are needed for the switch itself. `client.ts` reads the env vars.
- Nothing in `index.html`, `public/`, `vercel.json` or the build (sitemap, per-route meta) refers to Supabase.
- There's no service worker, and React Query's cache is in-memory only, so no cache will pin the old backend.

**Preview env:** set Vercel **Preview** variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` **scoped to the branch** `chore/supabase-migration`. Production and other previews stay on Lovable. Branch scoping needs to be confirmed on Hobby. If it doesn't work, use a `vercel deploy` with `--build-env`.

Run the whole **PRE** test matrix (§8.3) on this preview, including the B1-vs-B2 diff. Nothing moves to Phase 5 until it's all green.

## 8. End-to-end testing (hard requirement)

### 8.1 Principle: compare like with like
- Baseline B1 = production (the release code, old DB) after 0.1.
- B2 = the migration preview (the same code plus the migration-branch changes, new DB).
- B3 = production after cutover.

**Gates:** B1 ≡ B2 after normalisation, and B2 ≡ B3. Normalisation means:
- the project ref is replaced with `<REF>`
- `sitemap lastmod`, asset hashes, `x-vercel-*`, `age`, `date` and timings are dropped
- `order_index` values are turned into ranks

### 8.2 Baseline capture (`scripts/baseline/capture.mjs`, Node 20 + Playwright)
1. **HTTP layer:** every route in `routeMetadata`, every sitemap URL, plus a bogus path, `/wp-admin`, `/bilebandi-heidi-`, `/keikat/`, the apex host, `/admin`, `/login`, `/robots.txt`, `/sitemap.xml`, `/404.html`, and `GET /api/send-email`. For each one it records:
   - status, `location`, `x-robots-tag`
   - title, description, canonical, robots, all `og:*` and `twitter:*` tags
   - JSON-LD blocks, and any `supabase.co` references
   - the bundle URL, and every `*.supabase.co` host inside the bundle
2. **Data layer:** anon REST on the 4 tables. It records:
   - row counts, the `sb-project-ref` header, and a ref-normalised md5 of each table
   - a tally of URL hosts
   - a HEAD of every storage URL: status, length, type, `cache-control`
3. **Rendered layer (Playwright):** for each route it records:
   - the head after Helmet has run, and the JSON-LD parsed
   - visible counts: upcoming and past gigs, galleries, videos per section
   - `<img>` `currentSrc` and `naturalWidth`, and iframe `src`
   - request hosts, counting old-ref vs new-ref
   - console errors
   - Supabase resource timings and LCP

`scripts/baseline/diff.mjs A B` exits non-zero on any difference. Performance is compared against thresholds, not for equality.

**Already measured baseline (B0, production `fd4ce94`):**
- 6 routes return 200 with prebuilt HTML.
- The prebuilt HTML contains 0 JSON-LD blocks and 0 `supabase.co` references.
- The bundle contains the old ref exactly once.
- Row counts: gigs 41, videos 10, photo_sets 6, page_content 3. The capture script records the md5s for each table, so B1 is the authoritative baseline.
- Supabase REST TTFB is 135–240 ms through Cloudflare's Helsinki edge.
- Crawlers (Googlebot, GPTBot, ClaudeBot, PerplexityBot, facebookexternalhit, WhatsApp) all get 200 and the same page shell.
- `/llms.txt` returns 404.

**What depends on the DB:** only JS-rendered content does.
- The `/keikat` Event JSON-LD, whose `image` field comes from Supabase.
- The `/laulunopetus` Service `offers`.
- All gig, bio, gallery and laulunopetus content and images.

Everything a crawler that doesn't run JS sees is static and unaffected: meta, og, canonical, sitemap and robots.

### 8.3 Test matrix

**Legend:**
- **PRE** = must pass on the migration preview (new DB) before the production switch.
- **POST** = run on production right after the switch.
- **PW** = automated in Playwright. **Script** = a Node/curl script. **Manual** = done by hand.

**A. Public site**

| ID | Test | Expected | How | Gate |
|---|---|---|---|---|
| A1 | Project-ref isolation | Every page load makes ≥1 request to `<new>.supabase.co` and **0** to `yctdrwog…`. REST responses carry `sb-project-ref=<new>`. The bundle contains only the new host. **This also proves the publishable key works (finding 4).** | PW + script | PRE + POST |
| A2 | Every route renders from the DB | All 6 routes: 200, no error text, skeletons gone. Counts equal B1 (7 upcoming / 34 past gigs, 5 galleries + press kit, 8+2 videos). | PW | PRE + POST |
| A3 | Images | Every `<img>` has `naturalWidth>0` and uses the new ref. Hero CSS backgrounds (home, keikat, galleria, bio desktop and mobile) return 200. | PW | PRE + POST |
| A4 | Keikat | Upcoming sorted ascending, past sorted descending. "Näytä lisää" works. Grouped multi-date gigs show correctly. Ticket and event links have `target=_blank` and match the DB. | PW | PRE |
| A5 | Home | Gig cards link to `/keikat#<slug>` and the page scrolls there. YouTube, Spotify and Lightwidget iframes are present (third-party embeds are a soft check). | PW | PRE |
| A6 | Galleria | Masonry breakpoints, "Näytä lisää", and the lightbox (open, next/prev, Esc) with image `src` on the new ref. The press kit shows 3 photos. The zip returns 200 `application/zip` with the same size and sha256 as B1. | PW | PRE |
| A7 | Bio | Credits sorted, the featured video, 3 bio images. The CV link uses the new ref and returns 200 `application/pdf` with the same md5 as B1. | PW | PRE |
| A8 | Laulunopetus | Content comes from the DB. The booking CTA goes to `tampereenlaulukoulu.asioi.fi/…employee_id=1449` and returns 200. Pricing visibility matches B1. The contact scroll works. | PW | PRE |
| A9 | Bilebandi | Hero, YouTube `1IYiuMruQic`, the booking form, the mailto link, and no footer. | PW | PRE |
| A10 | Desktop nav | All 6 links, the active state, the `#contact-section` hash link, and the logo link to `/`. | PW | PRE + POST |
| A11 | Mobile menu | Opens and closes, aria state is correct, links navigate and close the menu, scroll unlocks. | PW (mobile project) | PRE |
| A12 | Footer | Nav and social links. The footer is hidden on bilebandi and admin. | PW | PRE |
| A13 | External links | Every external href in the DOM and the DB returns 2xx or 3xx. LinkedIn's 999 is allowed. | Script | PRE |
| A14 | 404 | A bogus path returns HTTP 404 with the branded page, `noindex, follow`, no canonical, and working quick links. | PW + script | PRE + POST |
| A15 | Redirects | Apex → www returns 308. `/keikat/` → `/keikat`. `/bilebandi-heidi-` → the full slug. `/admin` and `/login` return 200 with `X-Robots-Tag: noindex`. | Script | PRE* + POST |
| A16 | Console | No uncaught errors and no failed first-party requests. Noise from Lightwidget, YouTube and Spotify is allowlisted. | PW | PRE + POST |

\* The apex redirect exists only on the production domain.

**B. CMS.** All write tests run on the preview with the **test admin**. Every test record is prefixed `E2E-TESTI-<runId>`, uploaded storage paths are logged, and all of it is cleaned up in B15.

| ID | Test | Expected | How | Gate |
|---|---|---|---|---|
| B1 | Auth guard | `/admin` without a session redirects to `/login`. `/login` with a session redirects to `/admin`. | PW | PRE + POST |
| B2 | Login | A wrong password shows an error toast. The correct one lands on `/admin`, and all 6 tabs load from the new ref. | PW | PRE |
| B3 | Logout | A toast, then `/login`. The `sb-<new>-auth-token` entry is removed. | PW | PRE + POST |
| B4 | The real admin account | The owner (and Heidi, if D4 applies) log in on the preview. | Manual | PRE |
| B5 | Signup blocked | `POST /auth/v1/signup` is rejected with "Signups not allowed". An anonymous sign-in is rejected. | Script | PRE |
| B6 | Gig: create | 2 performances, an image upload, a far-future date. The gig shows grouped on `/keikat` and on home. The image uses the new ref. The Event JSON-LD includes it. | PW | PRE |
| B7 | Gig: edit / delete | Edit the title and replace the image, and the public page updates. Delete it, and it's gone. | PW | PRE |
| B8 | Videos | Add one in each section and check the embeds render. Drag to reorder: the order persists after a reload. Restore the order, then delete. | PW | PRE |
| B9 | Photo set | Create with 2 uploads, reorder photos, reorder sets, edit, delete. Galleria reflects each step. | PW | PRE |
| B10 | Press kit | Upload a replacement zip; its new URL returns 200. **Restore the original URL.** The real press kit must never be deleted. | PW + manual | PRE |
| B11 | Bio `page_content` | Edit a text and an image, check `/bio`, then revert. | PW | PRE |
| B12 | CV upsert | Upload a test PDF: same path, different md5. Record `cache-control` and how long the old file stays visible. Re-upload the original: md5 = B1. | PW + script | PRE |
| B13 | Page images | Replace the keikat hero (single image) and the bio hero (desktop and mobile). The pages update. Revert. | PW | PRE |
| B14 | Laulunopetus | Toggle `pricingVisible`: the prices disappear from the page **and** from the JSON-LD. Edit the CTA. Revert. | PW | PRE |
| B15 | Cleanup verification | Delete the logged storage objects and the test rows. The A4 md5s equal the post-import snapshot. No `E2E-TESTI` rows remain. | Script | PRE |
| B16 | Production CMS smoke test | Log in on production, open every tab, **make no writes**, log out. Heidi's first real edit comes afterwards. | Manual | POST |

**C. Contact forms.** These don't depend on Supabase, but the "all functionality" requirement covers them, and the spam guard changes their behaviour.

| ID | Test | Expected | How | Gate |
|---|---|---|---|---|
| C1 | Contact-form validation | An empty form or a message over 1000 characters shows the Finnish errors, and no request is sent (intercepted). | PW | PRE |
| C2 | Booking-form validation | Name, phone, email, date and message rules each show their error. No request is sent. | PW | PRE |
| C3 | API contract | Missing fields → 400. A bad `formType` → 400. GET → 405. OPTIONS → 200. **No email is sent.** | PW request | PRE |
| C4 | Honeypot UI | The field is hidden, not reachable by keyboard, and the payload carries `website:""` and `elapsedMs>0` (intercepted). | PW | PRE |
| C5 | Spam path | A POST with the honeypot filled returns 200, and the email arrives in the **tech inbox** with the spam prefix, not in Heidi's inbox. | Script + inbox check | PRE |
| C6 | `assessSpam` logic | Unit tests: fast-but-real submissions count as suspect, not spam. | vitest | PRE |
| C7 | Real delivery | One clearly marked test ("TESTI – ei vaadi toimenpiteitä") through the UI on **production**, with Heidi told beforehand. She confirms receipt, and Reply-To is the sender. | Manual | POST |

**D. SEO / GEO**

| ID | Test | Expected | How | Gate |
|---|---|---|---|---|
| D1 | Static meta | B1 vs B2 (and B2 vs B3) are **identical** per route: title, description, canonical, og/twitter tags, robots. Also asserted directly against `src/config/metadata.ts`. | Script + PW | PRE + POST |
| D2 | Rendered head | One canonical, one description, and no duplicate Helmet tags after hydration. | PW | PRE + POST |
| D3 | JSON-LD | The `/keikat` Events equal B1 after ref normalisation (count, names, dates, offers, required fields), and every `image` returns 200. The `/laulunopetus` Service and `/bio` Person JSON-LD are unchanged. | PW | PRE + POST |
| D4 | Rich Results Test and validator.schema.org | `/keikat` and `/laulunopetus` show 0 errors, and warnings are no worse than B0. | Manual | POST |
| D5 | Sitemap and robots | The same 6 `<loc>` entries (`lastmod` ignored), and robots.txt equal to B1. | Script | PRE + POST |
| D6 | Social previews | opengraph.xyz or the Facebook debugger for `/` and `/laulunopetus`. | Manual | POST |
| D7 | Google Search Console | URL Inspection → Test live URL for `/`, `/keikat` and `/galleria`: the rendered HTML includes gigs and Event JSON-LD, and no `*.supabase.co` resource is blocked. Watch Coverage and the Events report for 2 weeks. | Manual (GSC can't be automated) | POST |
| D8 | AI and search crawlers | Googlebot, GPTBot, ClaudeBot and PerplexityBot user agents get 200 and the same shell as B0. | Script | POST |

**E. Infrastructure**

| ID | Test | Expected | How | Gate |
|---|---|---|---|---|
| E1 | keep-db-alive | With the `CRON_SECRET` bearer: 200 "Pinged Supabase" against the new project. Without it: 401. After the first scheduled run, the Vercel cron log shows 200. | Script + manual | PRE + POST |
| E2 | Env scopes | `vercel env ls` (names only): Production and Preview point to the new project. `SUPABASE_FUNCTION_URL` is gone. `BREVO_API_KEY` and `CRON_SECRET` are present. A1 proves the rebuild happened. | Manual + script | PRE/POST |
| E3 | No old URLs | 0 occurrences of `yctdrwog…` in the 4 tables, using both REST and dashboard SQL. All 54 referenced objects are on the new host with the same size and type. | Script + SQL | PRE + POST |
| E4 | RLS lockdown | Anon: SELECT works, but INSERT, UPDATE and DELETE on every table are rejected, and a storage upload is rejected. | Script | PRE |
| E5 | Auth URLs | The Site URL and redirect allowlist are as in §4. | Manual | PRE |
| E6 | Storage headers | Record `cache-control` on the new objects against B0. The planning passes disagree here: object metadata says `max-age=3600`, but the served header was `no-cache`. Decide whether the difference is acceptable (it affects how quickly a replaced CV shows up). | Script | PRE |
| E7 | Old-project independence | After 24 h, production shows no requests to the old ref, and Lovable's Usage page shows no API traffic. Only then pause Lovable. | Manual | POST |

**F. Performance**

| ID | Test | Expected | How | Gate |
|---|---|---|---|---|
| F1 | Supabase latency | REST and storage p50 on `/` and `/galleria`: preview ≤ B1 + 100 ms. Stockholm should be faster than London. | PW | PRE |
| F2 | Lighthouse (mobile, `/` and `/galleria`) | Median of 3 runs: LCP ≤ B1 × 1.1, CLS unchanged. | Lighthouse CLI | PRE |
| F3 | Field data | PSI or CrUX 28 days after cutover. | Manual | POST |

### 8.4 Automation layout
```
playwright.config.ts   baseURL = $BASE_URL ?? http://localhost:8080; projects desktop-chromium + mobile;
                       Vercel protection-bypass header when VERCEL_AUTOMATION_BYPASS_SECRET is set;
                       tags @smoke @seo @cms-read @cms-write @mail @migration
e2e/fixtures.ts        network recorder (hosts, old/new ref counts, sb-project-ref), console collector + allowlist,
                       optional rAF stub (STUB_RAF=1, only for the hidden MCP browser), expectedRef from VITE_SUPABASE_URL
e2e/public/*  e2e/seo/*  e2e/contact/*  e2e/cms/{auth,crud}.spec.ts  e2e/infra/*  e2e/migration/* (throwaway)
scripts/baseline/{capture,diff}.mjs   → baseline/<label>/*.json (gitignored)
```
**Guards:**
- `@cms-write` and `@mail` refuse to run against `heidisimelius.fi` unless `ALLOW_PROD_WRITES=1`.
- CMS credentials come from `.env.local`.
- Drag-and-drop uses stepped `page.mouse` moves (for the dnd-kit PointerSensor).

**Kept permanently** as a regression suite (`npm run test:e2e:smoke`): the A smoke tests, D1–D3 and D5 (with `metadata.ts` as the source of truth), C1–C4, "exactly one Supabase host", `@cms-read`, opt-in `@cms-write`, and the `assessSpam` unit tests.

**Thrown away after cutover:** `e2e/migration/*`, the baseline JSONs, and the old-ref assertions.

## 9. Phase 5: cutover runbook

Visitors see no downtime: the old deployment keeps serving until the new build is ready, and the switch is atomic. The CMS is frozen for about 30–60 minutes.

1. **Tell Heidi** the freeze window: no CMS edits, and close all `/admin` tabs.
2. **Final sync:**
   - Re-run §6.3: export, truncate, import, then check A4.
   - Run the copy script, then `--verify-only`. The CV is always re-copied.
   - Re-run the §6.4 URL rewrite and the zero check, plus the 54 HEAD checks.
3. Note the **current production deployment ID**. It's the rollback target.
4. In Vercel **Production**: set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to the new values, and delete `SUPABASE_FUNCTION_URL` and `VITE_SUPABASE_PROJECT_ID`.
5. Merge `chore/supabase-migration` → `main` through a PR. That triggers the production build. `VITE_*` values are inlined at build time, so this rebuild is what switches the site.
6. Run the **POST** tests:
   - capture B3 and diff it against B2
   - A1–A3, A10, A14–A16, B1, B3, B16, C7, D-POST and E1/E2
   - grep the live bundle: the new ref must be present and the old one absent
7. End the freeze. Heidi hard-reloads, logs in again (the session key changed), and makes one real edit.
8. Point the Preview and Development scopes at the new values, and remove the branch-scoped overrides.
9. Switch on the gig ticket fields (their columns already exist): follow §6.2a "Switching it on", then run tests G1–G6.

**Rollback:**
- **Fast:** Vercel → Deployments → the step-3 deployment → **Instant Rollback**. Its bundle and runtime env still point at Lovable, so no rebuild is needed. On Hobby you can only roll back to the previous production deployment, so do it before any other production deploy.
- **Durable:** set the Production vars back to the Lovable values and redeploy.
- **Data:** any CMS edits made on the new DB after cutover have to be replayed by hand into Lovable. Keep a short edit log for the first days.

## 10. Phase 6: stabilise and decommission

- [ ] Days 1–5: the first scheduled keep-alive run shows 200 in Vercel's cron log. Consider an uptime or cron monitor, since the last cron failure went unnoticed for 11 months.
- [ ] The first backup succeeds:
  - **Free plan:** a daily GitHub Action runs `pg_dump --schema=public --schema=auth` through the session pooler into a **separate private repo** (or encrypted), plus a monthly mirror of the storage files. Scheduled Actions in a public repo get disabled after 60 days without activity.
  - **Pro plan:** the built-in daily backups, plus the same off-site dump.
- [ ] Watch free-tier egress (5 GB/mo), since every image is served from Storage.
- [ ] Day 1: E7 (no traffic to the old ref).
- [ ] Day 14: GSC Coverage and Events reports are clean (D7).
- [ ] **Week 4:** take a final Lovable export into the vault, then **Pause Cloud**. Pausing is reversible. Storage is still billed while paused.
- [ ] **Week 6+:** **Remove Lovable Cloud**, which can't be undone. Then:
  - downgrade or cancel the Lovable plan if it's paid
  - optionally delete the Lovable project
  - confirm the Lovable GitHub App is uninstalled
- [ ] Regenerate `types.ts` with `SUPABASE_ACCESS_TOKEN=<owner PAT> npx supabase gen types typescript --project-id <newref>`. The token is passed inline so the machine's logged-in CLI for another client isn't used (decision D9). The diff should show only the PostgREST version and the two gig columns.
- [ ] Update `CLAUDE.md` and the Claude memory note about the infra.

## 11. After the migration (separate, deliberately out of scope)

Keep the migration a like-for-like move. Queue these for afterwards:
1. **Admin-only write policies:** `auth.uid() = '<admin uuid>'`, or an `admins` table, instead of "any authenticated user".
2. Restrict listing through the public storage SELECT policy.
3. Remove the 21 orphaned storage files, and make the CMS delete replaced files.
4. Self-service password reset: a Brevo SMTP key in Supabase Auth plus a `/reset-password` route.
5. The `/media` proxy, if it's not done during the migration (D5).
6. Add an SPF record to heidisimelius.fi (it has none).
7. Make the GitHub repo private (the Lovable history is public today).

## 12. Decisions for the owner

| # | Decision | Recommendation |
|---|---|---|
| D1 | Supabase Free or Pro ($25/mo) | **Pro** if the budget allows: no pausing, and built-in backups. Otherwise Free plus the verified cron plus a private dump Action. |
| D2 | Which login owns the `simeliusweb` Supabase org, who is the backup owner, and which password manager | The owner's login is owner #1, the developer is owner #2, and a shared vault. |
| D3 | Region | eu-north-1 (Stockholm) |
| D4 | Which admin accounts to recreate | Whatever A3 shows. Keep the current CMS password or rotate it (rotating is recommended now that it will sit in the vault). |
| D5 | Serve storage through `https://www.heidisimelius.fi/media/...` (a Vercel rewrite) now | **Later** (§11). Keep the migration like-for-like. |
| D6 | Copy the 21 orphaned files | Yes, copy all 75. It's about 20 MB, and it gives a complete backup. |
| D7 | Fallback window | 4 weeks until Pause, 6+ weeks until Remove. |
| D8 | Where backups and exports live | The vault plus a private repo. Never the public repo. |
| D9 | Allow `npx supabase` with an inline owner token for types and backups | Yes, owner-approved. Never the machine's default CLI login. |
| D10 | Self-service password reset in this migration | No (§11). |

## 13. Owner checklist in Lovable, to do now (read-only)

1. Settings → Plans & credits: the plan and the **credit balance** (0.5).
2. Cloud → Secrets / Settings: is a connection string, DB password or service-role key shown anywhere? Expected: no.
3. Cloud → Jobs: are there any jobs? Cloud → Emails: is a sender domain set up? Cloud → Edge functions: are there functions other than `keep-db-alive`?
4. Cloud → Overview → Advanced settings: is **Export project data** available?
5. Cloud → SQL editor: does `select version();` run, and does the A3 query (`auth.users`) work? This tells us whether the editor role is restricted.
6. Settings → GitHub: which repo and branch are synced (for 0.4).
