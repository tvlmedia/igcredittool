insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'transaction-attachments',
  'transaction-attachments',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
)
on conflict (id) do nothing;

create table if not exists public.transaction_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type text,
  file_size bigint,
  created_at timestamptz not null default now()
);

create index if not exists transaction_attachments_transaction_idx
on public.transaction_attachments(transaction_id, created_at desc);

create index if not exists transaction_attachments_user_idx
on public.transaction_attachments(user_id, created_at desc);

alter table public.transaction_attachments enable row level security;

drop policy if exists "Transaction attachments are owned by users" on public.transaction_attachments;
create policy "Transaction attachments are owned by users"
on public.transaction_attachments for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users can read own transaction attachment objects" on storage.objects;
create policy "Users can read own transaction attachment objects"
on storage.objects for select
using (bucket_id = 'transaction-attachments' and name like auth.uid()::text || '/%');

drop policy if exists "Users can upload own transaction attachment objects" on storage.objects;
create policy "Users can upload own transaction attachment objects"
on storage.objects for insert
with check (bucket_id = 'transaction-attachments' and name like auth.uid()::text || '/%');

drop policy if exists "Users can delete own transaction attachment objects" on storage.objects;
create policy "Users can delete own transaction attachment objects"
on storage.objects for delete
using (bucket_id = 'transaction-attachments' and name like auth.uid()::text || '/%');
