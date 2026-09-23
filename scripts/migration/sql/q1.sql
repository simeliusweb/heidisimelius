select jsonb_build_object(
 'whoami', jsonb_build_object('user',current_user,'version',version(),'tz',current_setting('TimeZone'),'collate',(select datcollate from pg_database where datname=current_database())),
 'columns', coalesce((select jsonb_agg(jsonb_build_object('t',table_name,'col',column_name,'pos',ordinal_position,'type',udt_name,'null',is_nullable,'default',column_default) order by table_name,column_name) from information_schema.columns where table_schema='public'),'[]'),
 'enums', coalesce((select jsonb_object_agg(t.typname,(select jsonb_agg(e.enumlabel order by e.enumsortorder) from pg_enum e where e.enumtypid=t.oid)) from pg_type t where t.typnamespace='public'::regnamespace and t.typtype='e'),'{}'),
 'constraints', coalesce((select jsonb_agg(jsonb_build_object('t',conrelid::regclass::text,'name',conname,'def',pg_get_constraintdef(oid)) order by conrelid::regclass::text,conname) from pg_constraint where connamespace='public'::regnamespace and contype <> 'n'),'[]'),
 'indexes', coalesce((select jsonb_agg(indexdef order by indexname) from pg_indexes where schemaname='public'),'[]'),
 'rls', coalesce((select jsonb_object_agg(relname,jsonb_build_object('on',relrowsecurity,'forced',relforcerowsecurity,'acl',relacl::text,'owner',pg_get_userbyid(relowner))) from pg_class where relnamespace='public'::regnamespace and relkind in ('r','p','v','m')),'{}'),
 'policies', coalesce((select jsonb_agg(jsonb_build_object('s',schemaname,'t',tablename,'name',policyname,'perm',permissive,'roles',roles,'cmd',cmd,'using',qual,'check',with_check) order by schemaname,tablename,policyname) from pg_policies where schemaname in ('public','storage')),'[]'),
 'functions', coalesce((select jsonb_agg(jsonb_build_object('name',p.proname,'def',pg_get_functiondef(p.oid))) from pg_proc p where p.pronamespace='public'::regnamespace and p.prokind in ('f','p')),'[]'),
 'triggers', coalesce((select jsonb_agg(jsonb_build_object('t',c.oid::regclass::text,'name',t.tgname,'def',pg_get_triggerdef(t.oid))) from pg_trigger t join pg_class c on c.oid=t.tgrelid where not t.tgisinternal and c.relnamespace in ('public'::regnamespace,'auth'::regnamespace)),'[]'),
 'event_triggers', coalesce((select jsonb_agg(evtname||' '||evtevent order by evtname) from pg_event_trigger),'[]'),
 'default_acl', coalesce((select jsonb_agg(jsonb_build_object('role',defaclrole::regrole::text,'schema',defaclnamespace::regnamespace::text,'type',defaclobjtype,'acl',defaclacl::text)) from pg_default_acl),'[]'),
 'extensions', coalesce((select jsonb_agg(extname||' '||extversion order by extname) from pg_extension),'[]'),
 'publications', coalesce((select jsonb_agg(pubname||':'||schemaname||'.'||tablename) from pg_publication_tables),'[]'),
 'buckets', coalesce((select jsonb_agg(jsonb_build_object('id',id,'public',public,'size_limit',file_size_limit,'mime',allowed_mime_types) order by id) from storage.buckets),'[]'),
 'objects', coalesce((select jsonb_object_agg(bucket_id,jsonb_build_object('n',n,'bytes',b)) from (select bucket_id,count(*) n,sum((metadata->>'size')::bigint) b from storage.objects group by 1) o),'{}')
) as q1