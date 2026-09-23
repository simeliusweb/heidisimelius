-- Projects created after 2026-05-30 don't expose public tables to the Data API roles
-- automatically ("Automatically expose new tables" is off). Without these grants every
-- page shows no data. anon only reads; writes are further limited by RLS.
grant usage on schema public to anon, authenticated, service_role;
grant select on public.gigs, public.videos, public.photo_sets, public.page_content to anon;
grant select, insert, update, delete on public.gigs, public.videos, public.photo_sets, public.page_content to authenticated, service_role;
notify pgrst, 'reload schema';
