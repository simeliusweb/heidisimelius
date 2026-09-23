select (select count(*) from public.gigs t where to_jsonb(t)::text like '%yctdrwogilljanzxcgow%')
     + (select count(*) from public.videos t where to_jsonb(t)::text like '%yctdrwogilljanzxcgow%')
     + (select count(*) from public.photo_sets t where to_jsonb(t)::text like '%yctdrwogilljanzxcgow%')
     + (select count(*) from public.page_content t where to_jsonb(t)::text like '%yctdrwogilljanzxcgow%') as remaining
