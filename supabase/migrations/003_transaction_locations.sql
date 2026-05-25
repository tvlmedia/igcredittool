alter table public.transactions
  add column if not exists city text,
  add column if not exists country text,
  add column if not exists location_label text,
  add column if not exists latitude numeric(9, 6),
  add column if not exists longitude numeric(9, 6);

create index if not exists transactions_location_idx
on public.transactions(user_id, country, city)
where deleted_at is null;
