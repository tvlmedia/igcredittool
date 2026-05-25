create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  label text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_log_user_created_idx
on public.activity_log(user_id, created_at desc);

alter table public.activity_log enable row level security;

drop policy if exists "Activity is owned by users" on public.activity_log;
create policy "Activity is owned by users"
on public.activity_log for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());
