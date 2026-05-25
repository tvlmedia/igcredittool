update public.reminders
set status = 'used'
where status = 'done';

alter table public.reminders
drop constraint if exists reminders_status_check;

alter table public.reminders
alter column status set default 'open';

alter table public.reminders
add constraint reminders_status_check
check (status in ('open', 'followed_up', 'used', 'extended', 'ignored'));

create index if not exists reminders_user_status_due_idx
on public.reminders(user_id, status, due_date);
