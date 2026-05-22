create extension if not exists "pgcrypto";

do $$ begin
  create type public.profile_role as enum ('ambassador', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.transaction_type as enum ('sale', 'expo', 'rental_tour', 'expense', 'purchase');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.currency_code as enum ('EUR', 'USD');
exception when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  company text,
  role public.profile_role not null default 'ambassador',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.transaction_type not null,
  title text not null,
  description text,
  date date not null,
  currency public.currency_code not null,
  original_amount numeric(14, 2) not null,
  converted_amount_usd numeric(14, 2),
  exchange_rate_snapshot numeric(12, 6),
  attributed_to_transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sale_details (
  transaction_id uuid primary key references public.transactions(id) on delete cascade,
  sale_amount numeric(14, 2) not null,
  sale_currency public.currency_code not null,
  credit_percentage numeric(6, 3) not null default 10,
  linked_source_transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expo_details (
  transaction_id uuid primary key references public.transactions(id) on delete cascade,
  expo_name text not null,
  start_date date not null,
  days_count integer not null default 1 check (days_count > 0),
  default_credit_per_day numeric(14, 2) not null default 1000,
  daily_credits jsonb not null default '[]'::jsonb,
  expenses_multiplier numeric(8, 3) not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rental_tour_details (
  transaction_id uuid primary key references public.transactions(id) on delete cascade,
  tour_name text not null,
  start_date date not null,
  expenses_multiplier numeric(8, 3) not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expense_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  amount numeric(14, 2) not null,
  currency public.currency_code not null,
  converted_amount_usd numeric(14, 2),
  exchange_rate_snapshot numeric(12, 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_details (
  transaction_id uuid primary key references public.transactions(id) on delete cascade,
  purchase_name text not null,
  usd_credit_used numeric(14, 2) not null default 0,
  eur_credit_converted numeric(14, 2) not null default 0,
  converted_usd_amount numeric(14, 2) not null default 0,
  exchange_rate_snapshot numeric(12, 6),
  payment_mode text not null default 'mixed' check (payment_mode in ('usd_credit', 'eur_to_usd', 'mixed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#e1b45f',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.transaction_tags (
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (transaction_id, tag_id)
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete cascade,
  title text not null,
  due_date date not null,
  status text not null default 'open' check (status in ('open', 'done')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx on public.transactions(user_id, date desc);
create index if not exists transactions_type_idx on public.transactions(type);
create index if not exists transactions_attribution_idx on public.transactions(attributed_to_transaction_id);
create index if not exists expense_items_transaction_idx on public.expense_items(transaction_id);
create index if not exists reminders_user_due_idx on public.reminders(user_id, due_date);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_transactions_updated_at on public.transactions;
create trigger set_transactions_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

drop trigger if exists set_sale_details_updated_at on public.sale_details;
create trigger set_sale_details_updated_at
before update on public.sale_details
for each row execute function public.set_updated_at();

drop trigger if exists set_expo_details_updated_at on public.expo_details;
create trigger set_expo_details_updated_at
before update on public.expo_details
for each row execute function public.set_updated_at();

drop trigger if exists set_rental_tour_details_updated_at on public.rental_tour_details;
create trigger set_rental_tour_details_updated_at
before update on public.rental_tour_details
for each row execute function public.set_updated_at();

drop trigger if exists set_expense_items_updated_at on public.expense_items;
create trigger set_expense_items_updated_at
before update on public.expense_items
for each row execute function public.set_updated_at();

drop trigger if exists set_purchase_details_updated_at on public.purchase_details;
create trigger set_purchase_details_updated_at
before update on public.purchase_details
for each row execute function public.set_updated_at();

drop trigger if exists set_reminders_updated_at on public.reminders;
create trigger set_reminders_updated_at
before update on public.reminders
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role and not public.is_admin() then
    raise exception 'Only admins can change profile roles.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_profile_role_escalation on public.profiles;
create trigger prevent_profile_role_escalation
before update on public.profiles
for each row execute function public.prevent_profile_role_escalation();

create or replace function public.ensure_transaction_attribution_owned()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.attributed_to_transaction_id is not null and not exists (
    select 1
    from public.transactions source
    where source.id = new.attributed_to_transaction_id
      and source.user_id = new.user_id
      and source.type in ('expo', 'rental_tour')
  ) then
    raise exception 'Attributed source must belong to the same user.';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_transaction_attribution_owned on public.transactions;
create trigger ensure_transaction_attribution_owned
before insert or update on public.transactions
for each row execute function public.ensure_transaction_attribution_owned();

create or replace function public.ensure_sale_source_owned()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
begin
  select user_id into owner_id
  from public.transactions
  where id = new.transaction_id;

  if new.linked_source_transaction_id is not null and not exists (
    select 1
    from public.transactions source
    where source.id = new.linked_source_transaction_id
      and source.user_id = owner_id
      and source.type in ('expo', 'rental_tour')
  ) then
    raise exception 'Linked sale source must belong to the same user.';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_sale_source_owned on public.sale_details;
create trigger ensure_sale_source_owned
before insert or update on public.sale_details
for each row execute function public.ensure_sale_source_owned();

create or replace function public.ensure_child_user_matches_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.transactions t
    where t.id = new.transaction_id
      and t.user_id = new.user_id
  ) then
    raise exception 'Child row user_id must match transaction owner.';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_expense_user_matches_transaction on public.expense_items;
create trigger ensure_expense_user_matches_transaction
before insert or update on public.expense_items
for each row execute function public.ensure_child_user_matches_transaction();

drop trigger if exists ensure_transaction_tag_user_matches_transaction on public.transaction_tags;
create trigger ensure_transaction_tag_user_matches_transaction
before insert or update on public.transaction_tags
for each row execute function public.ensure_child_user_matches_transaction();

create or replace function public.ensure_transaction_tag_user_matches_tag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.tags tag
    where tag.id = new.tag_id
      and tag.user_id = new.user_id
  ) then
    raise exception 'Transaction tag user_id must match tag owner.';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_transaction_tag_user_matches_tag on public.transaction_tags;
create trigger ensure_transaction_tag_user_matches_tag
before insert or update on public.transaction_tags
for each row execute function public.ensure_transaction_tag_user_matches_tag();

alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.sale_details enable row level security;
alter table public.expo_details enable row level security;
alter table public.rental_tour_details enable row level security;
alter table public.expense_items enable row level security;
alter table public.purchase_details enable row level security;
alter table public.tags enable row level security;
alter table public.transaction_tags enable row level security;
alter table public.reminders enable row level security;

drop policy if exists "Profiles are readable by owner or admin" on public.profiles;
create policy "Profiles are readable by owner or admin"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

drop policy if exists "Profiles are editable by owner or admin" on public.profiles;
create policy "Profiles are editable by owner or admin"
on public.profiles for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "Transactions are owned by users" on public.transactions;
create policy "Transactions are owned by users"
on public.transactions for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Sale details follow transaction ownership" on public.sale_details;
create policy "Sale details follow transaction ownership"
on public.sale_details for all
using (
  exists (
    select 1 from public.transactions t
    where t.id = transaction_id and (t.user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.transactions t
    where t.id = transaction_id and (t.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "Expo details follow transaction ownership" on public.expo_details;
create policy "Expo details follow transaction ownership"
on public.expo_details for all
using (
  exists (
    select 1 from public.transactions t
    where t.id = transaction_id and (t.user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.transactions t
    where t.id = transaction_id and (t.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "Rental tour details follow transaction ownership" on public.rental_tour_details;
create policy "Rental tour details follow transaction ownership"
on public.rental_tour_details for all
using (
  exists (
    select 1 from public.transactions t
    where t.id = transaction_id and (t.user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.transactions t
    where t.id = transaction_id and (t.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "Purchase details follow transaction ownership" on public.purchase_details;
create policy "Purchase details follow transaction ownership"
on public.purchase_details for all
using (
  exists (
    select 1 from public.transactions t
    where t.id = transaction_id and (t.user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.transactions t
    where t.id = transaction_id and (t.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "Expense items are owned by users" on public.expense_items;
create policy "Expense items are owned by users"
on public.expense_items for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Tags are owned by users" on public.tags;
create policy "Tags are owned by users"
on public.tags for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Transaction tags are owned by users" on public.transaction_tags;
create policy "Transaction tags are owned by users"
on public.transaction_tags for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Reminders are owned by users" on public.reminders;
create policy "Reminders are owned by users"
on public.reminders for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());
