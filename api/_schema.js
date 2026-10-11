// The table behind cloud sync. supabase.sql holds the same statements (a test keeps them identical).
export const SCHEMA_SQL = `
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
`;

/** Database address the Vercel–Supabase integration puts in the project's environment. */
export function pickDatabaseUrl(env = {}) {
  return env.POSTGRES_URL_NON_POOLING || env.POSTGRES_URL || env.POSTGRES_PRISMA_URL || env.SUPABASE_DB_URL || "";
}

/** pg wants ssl as an option; a sslmode in the URL would override it with strict checking. */
export function connectionConfig(url) {
  const u = new URL(url);
  u.searchParams.delete("sslmode");
  u.searchParams.delete("supa");
  return { connectionString: u.toString(), ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000, statement_timeout: 15000 };
}
