-- CMS writes need app_metadata.cms_admin = true in the user's JWT. Only the service role can
-- set app_metadata, so an account that somehow gets created (signups are disabled) still can't
-- change the site. Public read policies are unchanged; the CV upsert needs the public SELECT.

drop policy if exists "Authenticated users can manage gigs" on public.gigs;
drop policy if exists "CMS admins manage gigs" on public.gigs;
create policy "CMS admins manage gigs" on public.gigs for all to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'cms_admin') = 'true')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'cms_admin') = 'true');

drop policy if exists "Authenticated users can manage videos" on public.videos;
drop policy if exists "CMS admins manage videos" on public.videos;
create policy "CMS admins manage videos" on public.videos for all to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'cms_admin') = 'true')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'cms_admin') = 'true');

drop policy if exists "Authenticated users can manage photo_sets" on public.photo_sets;
drop policy if exists "CMS admins manage photo_sets" on public.photo_sets;
create policy "CMS admins manage photo_sets" on public.photo_sets for all to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'cms_admin') = 'true')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'cms_admin') = 'true');

drop policy if exists "Authenticated users can manage page_content" on public.page_content;
drop policy if exists "CMS admins manage page_content" on public.page_content;
create policy "CMS admins manage page_content" on public.page_content for all to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'cms_admin') = 'true')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'cms_admin') = 'true');

-- Storage: the 12 authenticated insert/update/delete policies, now also claim-gated.

drop policy if exists "Authenticated users can upload gig images" on storage.objects;
create policy "Authenticated users can upload gig images" on storage.objects for insert to authenticated
  with check (bucket_id = 'gigs-images' and (select auth.jwt() -> 'app_metadata' ->> 'cms_admin') = 'true');
drop policy if exists "Authenticated users can update gig images" on storage.objects;
create policy "Authenticated users can update gig images" on storage.objects for update to authenticated
  using (bucket_id = 'gigs-images' and (select auth.jwt() -> 'app_metadata' ->> 'cms_admin') = 'true')
  with check (bucket_id = 'gigs-images' and (select auth.jwt() -> 'app_metadata' ->> 'cms_admin') = 'true');
drop policy if exists "Authenticated users can delete gig images" on storage.objects;
create policy "Authenticated users can delete gig images" on storage.objects for delete to authenticated
  using (bucket_id = 'gigs-images' and (select auth.jwt() -> 'app_metadata' ->> 'cms_admin') = 'true');

drop policy if exists "Authenticated users can upload photo set images" on storage.objects;
create policy "Authenticated users can upload photo set images" on storage.objects for insert to authenticated
  with check (bucket_id = 'photo_sets_images' and (select auth.jwt() -> 'app_metadata' ->> 'cms_admin') = 'true');
drop policy if exists "Authenticated users can update photo set images" on storage.objects;
create policy "Authenticated users can update photo set images" on storage.objects for update to authenticated
  using (bucket_id = 'photo_sets_images' and (select auth.jwt() -> 'app_metadata' ->> 'cms_admin') = 'true')
  with check (bucket_id = 'photo_sets_images' and (select auth.jwt() -> 'app_metadata' ->> 'cms_admin') = 'true');
drop policy if exists "Authenticated users can delete photo set images" on storage.objects;
create policy "Authenticated users can delete photo set images" on storage.objects for delete to authenticated
  using (bucket_id = 'photo_sets_images' and (select auth.jwt() -> 'app_metadata' ->> 'cms_admin') = 'true');

drop policy if exists "Authenticated users can upload documents" on storage.objects;
create policy "Authenticated users can upload documents" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (select auth.jwt() -> 'app_metadata' ->> 'cms_admin') = 'true');
drop policy if exists "Authenticated users can update documents" on storage.objects;
create policy "Authenticated users can update documents" on storage.objects for update to authenticated
  using (bucket_id = 'documents' and (select auth.jwt() -> 'app_metadata' ->> 'cms_admin') = 'true')
  with check (bucket_id = 'documents' and (select auth.jwt() -> 'app_metadata' ->> 'cms_admin') = 'true');
drop policy if exists "Authenticated users can delete documents" on storage.objects;
create policy "Authenticated users can delete documents" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (select auth.jwt() -> 'app_metadata' ->> 'cms_admin') = 'true');

drop policy if exists "Authenticated users can upload images" on storage.objects;
create policy "Authenticated users can upload images" on storage.objects for insert to authenticated
  with check (bucket_id = 'images' and (select auth.jwt() -> 'app_metadata' ->> 'cms_admin') = 'true');
drop policy if exists "Authenticated users can update images" on storage.objects;
create policy "Authenticated users can update images" on storage.objects for update to authenticated
  using (bucket_id = 'images' and (select auth.jwt() -> 'app_metadata' ->> 'cms_admin') = 'true')
  with check (bucket_id = 'images' and (select auth.jwt() -> 'app_metadata' ->> 'cms_admin') = 'true');
drop policy if exists "Authenticated users can delete images" on storage.objects;
create policy "Authenticated users can delete images" on storage.objects for delete to authenticated
  using (bucket_id = 'images' and (select auth.jwt() -> 'app_metadata' ->> 'cms_admin') = 'true');
