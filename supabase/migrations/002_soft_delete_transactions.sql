alter table public.transactions
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;

create index if not exists transactions_active_user_date_idx
on public.transactions(user_id, date desc)
where deleted_at is null;

create index if not exists transactions_deleted_user_date_idx
on public.transactions(user_id, deleted_at desc)
where deleted_at is not null;
