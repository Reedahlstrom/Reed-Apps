-- ============================================================
-- Reed Apps / Trip Leader — Postgres schema (Supabase)
-- Project: xfspyweaegrxibrryfgg
-- Run in Supabase → SQL Editor → New query → Run.
--
-- Model: one JSONB row per trip. Access is per-trip MEMBERSHIP. A leader
-- creates a trip and shares it by generating an invite code; a co-leader signs
-- in (email + password) and redeems the code to join the same trip. Everyone
-- who is a member sees and edits that trip live.
--
-- NOTE: For password sign-in to log people straight in, disable email
-- confirmation: Authentication → Providers → Email → turn OFF "Confirm email".
-- ============================================================

create extension if not exists "pgcrypto";

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

-- ---------- membership ----------
create table if not exists public.trip_members (
  trip_id uuid references public.trips (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  role text not null default 'editor',
  added_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);
create index if not exists trip_members_user_idx on public.trip_members (user_id);

-- ---------- invites ----------
create table if not exists public.trip_invites (
  code text primary key,
  trip_id uuid references public.trips (id) on delete cascade,
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trips_touch on public.trips;
create trigger trips_touch before update on public.trips
  for each row execute function public.touch_updated_at();

-- creator is automatically a member
create or replace function public.add_owner_membership()
returns trigger language plpgsql security definer as $$
begin
  if new.owner is not null then
    insert into public.trip_members (trip_id, user_id, role)
    values (new.id, new.owner, 'owner') on conflict do nothing;
  end if;
  return new;
end; $$;

drop trigger if exists trips_owner_member on public.trips;
create trigger trips_owner_member after insert on public.trips
  for each row execute function public.add_owner_membership();

-- membership check (security definer → no RLS recursion)
create or replace function public.is_member(t uuid)
returns boolean language sql stable security definer as $$
  select exists (select 1 from public.trip_members m where m.trip_id = t and m.user_id = auth.uid());
$$;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_invites enable row level security;

drop policy if exists "read member trips" on public.trips;
create policy "read member trips" on public.trips for select
  using (public.is_member(id) or owner = auth.uid());

drop policy if exists "insert own trips" on public.trips;
create policy "insert own trips" on public.trips for insert
  with check (owner = auth.uid() or public.is_member(id));

drop policy if exists "update member trips" on public.trips;
create policy "update member trips" on public.trips for update
  using (public.is_member(id) or owner = auth.uid())
  with check (public.is_member(id) or owner = auth.uid());

drop policy if exists "delete own trips" on public.trips;
create policy "delete own trips" on public.trips for delete
  using (owner = auth.uid());

drop policy if exists "read membership" on public.trip_members;
create policy "read membership" on public.trip_members for select
  using (user_id = auth.uid() or public.is_member(trip_id));

drop policy if exists "leave trip" on public.trip_members;
create policy "leave trip" on public.trip_members for delete
  using (user_id = auth.uid() or exists (select 1 from public.trips t where t.id = trip_id and t.owner = auth.uid()));

drop policy if exists "members make invites" on public.trip_invites;
create policy "members make invites" on public.trip_invites for insert
  with check (public.is_member(trip_id));

drop policy if exists "members read invites" on public.trip_invites;
create policy "members read invites" on public.trip_invites for select
  using (public.is_member(trip_id));

drop policy if exists "members delete invites" on public.trip_invites;
create policy "members delete invites" on public.trip_invites for delete
  using (public.is_member(trip_id));

-- ============================================================
-- Redeem an invite — runs as definer so a not-yet-member can join.
-- ============================================================
create or replace function public.redeem_invite(invite_code text)
returns uuid language plpgsql security definer as $$
declare t uuid;
begin
  select trip_id into t from public.trip_invites
    where code = invite_code and (expires_at is null or expires_at > now());
  if t is null then return null; end if;
  insert into public.trip_members (trip_id, user_id, role)
    values (t, auth.uid(), 'editor') on conflict do nothing;
  return t;
end; $$;

grant execute on function public.redeem_invite(text) to authenticated;

-- ============================================================
-- Realtime: live updates across both phones.
-- ============================================================
alter publication supabase_realtime add table public.trips;
