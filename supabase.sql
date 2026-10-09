-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query → Run).
-- It creates one table that holds each person's study data, and locks it so that
-- every account can only ever read and write its own rows.

create table if not exists public.app_data (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  key        text        not null,
  data       jsonb       not null,
  rev        integer     not null default 1,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.app_data enable row level security;

drop policy if exists "own rows: select" on public.app_data;
drop policy if exists "own rows: insert" on public.app_data;
drop policy if exists "own rows: update" on public.app_data;
drop policy if exists "own rows: delete" on public.app_data;

create policy "own rows: select" on public.app_data for select using (auth.uid() = user_id);
create policy "own rows: insert" on public.app_data for insert with check (auth.uid() = user_id);
create policy "own rows: update" on public.app_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows: delete" on public.app_data for delete using (auth.uid() = user_id);

create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists app_data_touch on public.app_data;
create trigger app_data_touch before update on public.app_data
  for each row execute function public.touch_updated_at();
