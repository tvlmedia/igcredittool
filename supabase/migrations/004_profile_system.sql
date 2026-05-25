alter table public.profiles
  add column if not exists home_base_city text,
  add column if not exists home_base_country text,
  add column if not exists home_base_latitude numeric,
  add column if not exists home_base_longitude numeric,
  add column if not exists website text,
  add column if not exists instagram text,
  add column if not exists youtube text,
  add column if not exists vimeo text,
  add column if not exists facebook text,
  add column if not exists linkedin text;

create table if not exists public.owned_lenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand text not null,
  model text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists owned_lenses_user_idx
on public.owned_lenses(user_id, created_at);

drop trigger if exists set_owned_lenses_updated_at on public.owned_lenses;
create trigger set_owned_lenses_updated_at
before update on public.owned_lenses
for each row execute function public.set_updated_at();

alter table public.owned_lenses enable row level security;

drop policy if exists "Profiles are insertable by owner or admin" on public.profiles;
create policy "Profiles are insertable by owner or admin"
on public.profiles for insert
with check (id = auth.uid() or public.is_admin());

drop policy if exists "Owned lenses are owned by users" on public.owned_lenses;
create policy "Owned lenses are owned by users"
on public.owned_lenses for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());
