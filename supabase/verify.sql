-- Read-only verification: run after schema.sql in the SQL Editor.
-- Success means the expected access controls are present; no rows/users/emails are created.
do $$
declare
  rpc oid := to_regprocedure('public.save_workspace_backup(uuid,uuid,uuid,text,text,text,bigint,jsonb)');
  owner_policies integer;
begin
  if not exists(select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'workspace_backups' and c.relrowsecurity) then
    raise exception 'Backup table is missing or row-level security is not enabled.';
  end if;
  if has_table_privilege('anon', 'public.workspace_backups', 'SELECT') or has_table_privilege('anon', 'public.workspace_backups', 'INSERT') or has_table_privilege('anon', 'public.workspace_backups', 'UPDATE') or has_table_privilege('anon', 'public.workspace_backups', 'DELETE') then
    raise exception 'Signed-out users unexpectedly have backup table privileges.';
  end if;
  if not has_table_privilege('authenticated', 'public.workspace_backups', 'SELECT') or not has_table_privilege('authenticated', 'public.workspace_backups', 'INSERT') or not has_table_privilege('authenticated', 'public.workspace_backups', 'DELETE') or has_table_privilege('authenticated', 'public.workspace_backups', 'UPDATE') then
    raise exception 'Signed-in table privileges differ from the expected backup-only access.';
  end if;
  select count(*) into owner_policies from pg_policies where schemaname = 'public' and tablename = 'workspace_backups'
    and roles = array['authenticated']::name[] and cmd in ('SELECT','INSERT','DELETE')
    and coalesce(qual, with_check) like '%auth.uid()%' and coalesce(qual, with_check) like '%owner_id%';
  if owner_policies <> 3 or (select count(*) from pg_policies where schemaname = 'public' and tablename = 'workspace_backups') <> 3 then
    raise exception 'Backup owner policies are missing or unexpected extra policies exist.';
  end if;
  if rpc is null or (select prosecdef from pg_proc where oid = rpc) then
    raise exception 'Backup function is missing or unexpectedly bypasses caller permissions.';
  end if;
  if has_function_privilege('anon', rpc, 'EXECUTE') or not has_function_privilege('authenticated', rpc, 'EXECUTE') then
    raise exception 'Backup function execution grants are incorrect.';
  end if;
end;
$$;
