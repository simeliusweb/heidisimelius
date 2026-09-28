-- Read-only login role for the off-platform backup (GitHub Action in the private
-- simeliusweb/heidisimelius-backup repo → Cloudflare R2). pg_dump of the public schema plus the
-- Storage object list, nothing else: no writes anywhere.
--
-- BYPASSRLS: every public table has RLS enabled, and pg_dump runs with row_security = off, so a
-- role subject to RLS would fail the dump instead of silently reading filtered rows.
--
-- The role is created NOLOGIN here; the password is set outside the repo
-- (`alter role backup_ro with login password '…'`), and the pooler URL lives only in the
-- backup repo's SUPABASE_DB_URL secret.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'backup_ro') then
    create role backup_ro nologin bypassrls;
  end if;
end $$;

grant usage on schema public to backup_ro;
grant select on all tables in schema public to backup_ro;
grant select on all sequences in schema public to backup_ro;
alter default privileges in schema public grant select on tables to backup_ro;
alter default privileges in schema public grant select on sequences to backup_ro;

grant usage on schema storage to backup_ro;
grant select on storage.objects to backup_ro;
