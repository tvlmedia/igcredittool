create table if not exists public.credit_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month integer not null check (month between 1 and 12),
  year integer not null check (year >= 2000),
  period_start date not null,
  period_end date not null,
  eur_reserve numeric(14, 2) not null default 0,
  usd_reserve numeric(14, 2) not null default 0,
  live_eur_usd_rate numeric(12, 6) not null default 1,
  total_usd_equivalent numeric(14, 2) not null default 0,
  total_earned numeric(14, 2) not null default 0,
  total_spent numeric(14, 2) not null default 0,
  transaction_count integer not null default 0,
  countries_visited integer not null default 0,
  cities_visited integer not null default 0,
  report_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  emailed_at timestamptz
);

create unique index if not exists credit_snapshots_user_period_idx
on public.credit_snapshots(user_id, year, month);

create index if not exists credit_snapshots_user_created_idx
on public.credit_snapshots(user_id, created_at desc);

alter table public.credit_snapshots enable row level security;

drop policy if exists "Credit snapshots are readable by owner or admin" on public.credit_snapshots;
create policy "Credit snapshots are readable by owner or admin"
on public.credit_snapshots for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Credit snapshots are insertable by owner or admin" on public.credit_snapshots;
create policy "Credit snapshots are insertable by owner or admin"
on public.credit_snapshots for insert
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Credit snapshots are editable by owner or admin" on public.credit_snapshots;
create policy "Credit snapshots are editable by owner or admin"
on public.credit_snapshots for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());
