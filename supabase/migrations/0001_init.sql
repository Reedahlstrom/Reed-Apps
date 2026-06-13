-- ============================================================
-- Reed Apps — Trip Leader schema (Postgres / Supabase)
-- Project: xfspyweaegrxibrryfgg  (HXP Trip Leader)
-- Run this in Supabase → SQL Editor → New query → Run.
--
-- Model: one row per Trip; the entire trip document lives in a JSONB column.
-- Access: magic-link auth + an email ALLOWLIST. Both leaders are on the
-- allowlist and share all trips, so everything syncs across both phones and
-- nothing is siloed. A random person who magic-links in gets zero data access.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- who is allowed in ----------
create table if not exists public.allowed_emails (
  email text primary key,
  label text,
  added_at timestamptz not null default now()
);

-- Seed everyone who can sign in. All of them share every trip and can edit
-- every part of it (bus buddies, food, meetings, devotionals — everything).
-- >>> Replace the two co-leader emails before running. <<<
insert into public.allowed_emails (email, label) values
  ('reedahlstrom@gmail.com', 'Reed — Leader'),
  ('elena-email@example.com', 'Elena — Co-Leader (Trip 1)'),
  ('bri-email@example.com',   'Bri — Co-Leader (Trip 2)')
on conflict (email) do nothing;

-- ---------- trips (whole document as JSONB) ----------
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  data jsonb not null default '{}'::jsonb,
  rev bigint not null default 0,
  owner uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trips_touch on public.trips;
create trigger trips_touch
  before update on public.trips
  for each row execute function public.touch_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
create or replace function public.is_allowed()
returns boolean language sql stable as $$
  select exists (
    select 1 from public.allowed_emails a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

alter table public.trips enable row level security;
alter table public.allowed_emails enable row level security;

drop policy if exists "allowed read trips" on public.trips;
create policy "allowed read trips" on public.trips
  for select using (public.is_allowed());

drop policy if exists "allowed insert trips" on public.trips;
create policy "allowed insert trips" on public.trips
  for insert with check (public.is_allowed());

drop policy if exists "allowed update trips" on public.trips;
create policy "allowed update trips" on public.trips
  for update using (public.is_allowed()) with check (public.is_allowed());

drop policy if exists "allowed delete trips" on public.trips;
create policy "allowed delete trips" on public.trips
  for delete using (public.is_allowed());

-- Allowlisted users may read the allowlist (so the app can show who has access).
drop policy if exists "allowed read allowlist" on public.allowed_emails;
create policy "allowed read allowlist" on public.allowed_emails
  for select using (public.is_allowed());

-- ============================================================
-- Realtime: live updates across both phones.
-- (Also enable "trips" under Database → Replication if needed.)
-- ============================================================
alter publication supabase_realtime add table public.trips;
