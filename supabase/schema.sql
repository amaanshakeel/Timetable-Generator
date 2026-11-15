-- Bootstrap for the dedicated timetable-backup project. No shared editing is enabled.
create table if not exists public.workspace_backups (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null,
  device_name text not null check (char_length(device_name) between 1 and 100),
  workspace_id text not null check (char_length(workspace_id) between 1 and 200),
  workspace_name text not null check (char_length(workspace_name) between 1 and 200),
  revision bigint not null check (revision >= 0),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object' and octet_length(snapshot::text) <= 10000000),
  created_at timestamptz not null default now()
);
create index if not exists workspace_backups_owner_created on public.workspace_backups(owner_id, created_at desc);
create index if not exists workspace_backups_retention on public.workspace_backups(owner_id, device_id, workspace_id, created_at desc);
alter table public.workspace_backups enable row level security;
revoke all on public.workspace_backups from anon, authenticated;
grant select, insert, delete on public.workspace_backups to authenticated;
create policy "Owners read backups" on public.workspace_backups for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Owners create backups" on public.workspace_backups for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Owners prune backup history" on public.workspace_backups for delete to authenticated using ((select auth.uid()) = owner_id);

create or replace function public.save_workspace_backup(
  p_backup_id uuid, p_owner_id uuid, p_device_id uuid, p_device_name text,
  p_workspace_id text, p_workspace_name text, p_revision bigint, p_snapshot jsonb
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  current_owner uuid := auth.uid();
  existing public.workspace_backups%rowtype;
begin
  -- Bind an outbox job to its original account, even if a browser session changes in flight.
  if current_owner is null or p_owner_id is distinct from current_owner then
    raise exception 'Sign in with the backup owner account.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_snapshot) <> 'object' or p_snapshot->>'id' is distinct from p_workspace_id
     or p_snapshot->>'schemaVersion' is distinct from '1'
     or p_snapshot->>'revision' is distinct from p_revision::text then
    raise exception 'The backup workspace and revision do not match.';
  end if;
  insert into public.workspace_backups(id, owner_id, device_id, device_name, workspace_id, workspace_name, revision, snapshot)
    values(p_backup_id, current_owner, p_device_id, p_device_name, p_workspace_id, p_workspace_name, p_revision, p_snapshot)
    on conflict(id) do nothing;
  select * into existing from public.workspace_backups where id = p_backup_id and owner_id = current_owner;
  if existing.id is null or existing.device_id <> p_device_id or existing.workspace_id <> p_workspace_id
     or existing.revision <> p_revision or existing.snapshot <> p_snapshot then
    raise exception 'This backup could not be confirmed for the current account.' using errcode = '42501';
  end if;
  -- Keep the latest 20 versions, plus daily recovery points from the last 30 days.
  with ranked as (
    select id, created_at,
      row_number() over(order by created_at desc, id desc) as recent_rank,
      row_number() over(partition by date_trunc('day', created_at at time zone 'UTC') order by created_at desc, id desc) as daily_rank
    from public.workspace_backups
    where owner_id = current_owner and device_id = p_device_id and workspace_id = p_workspace_id
  )
  delete from public.workspace_backups b using ranked r
    where b.id = r.id and b.owner_id = current_owner and r.recent_rank > 20
      and (r.daily_rank > 1 or r.created_at < now() - interval '30 days');
  return p_backup_id;
end;
$$;
revoke all on function public.save_workspace_backup(uuid, uuid, uuid, text, text, text, bigint, jsonb) from public, anon;
grant execute on function public.save_workspace_backup(uuid, uuid, uuid, text, text, text, bigint, jsonb) to authenticated;
