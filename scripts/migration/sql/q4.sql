with x as (
  select 'gigs' tbl, t.id::text k, to_jsonb(t) - 'ticket_price' - 'duration_minutes'
    || jsonb_build_object('created_at',       to_char(t.created_at       at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US'),
                          'performance_date', to_char(t.performance_date at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US')) j
  from public.gigs t
  union all select 'videos', t.id::text, to_jsonb(t)
    || jsonb_build_object('created_at', to_char(t.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US')) from public.videos t
  union all select 'photo_sets', t.id::text, to_jsonb(t)
    || jsonb_build_object('created_at', to_char(t.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US')) from public.photo_sets t
  union all select 'page_content', t.page_name, to_jsonb(t)
    || jsonb_build_object('created_at', to_char(t.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US'),
                          'updated_at', to_char(t.updated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US')) from public.page_content t
)
select tbl, count(*)::int n, md5(string_agg(j::text, E'
' order by k collate "C")) md5 from x group by tbl order by tbl
