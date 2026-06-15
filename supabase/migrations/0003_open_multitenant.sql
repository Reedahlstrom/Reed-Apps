-- ============================================================
-- Reed Apps — OPEN multi-tenant model
-- Any trip leader signs up, creates their own trip(s), and shares each with
-- a co-leader via an invite code. No allowlist, no email verification.
-- Access is per-trip membership (you only see trips you own or were invited to).
-- Idempotent — safe to re-run.
-- ============================================================

-- ---------- membership ----------
create table if not exists public.trip_members (
  trip_id uuid references public.trips (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  role text not null default 'editor',           -- 'owner' | 'editor'
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

-- ---------- helpers (security definer → no RLS recursion) ----------
create or replace function public.is_member(t uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.trip_members m where m.trip_id = t and m.user_id = auth.uid());
$$;

create or replace function public.add_owner_membership()
returns trigger language plpgsql security definer set search_path = public as $$
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

create or replace function public.redeem_invite(invite_code text)
returns uuid language plpgsql security definer set search_path = public as $$
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

-- ---------- backfill: existing trips' owners become members ----------
insert into public.trip_members (trip_id, user_id, role)
  select id, owner, 'owner' from public.trips where owner is not null
  on conflict do nothing;

-- ============================================================
-- RLS: membership-based (replaces the old allowlist)
-- ============================================================
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_invites enable row level security;

drop policy if exists "allowed read trips" on public.trips;
drop policy if exists "allowed insert trips" on public.trips;
drop policy if exists "allowed update trips" on public.trips;
drop policy if exists "allowed delete trips" on public.trips;

drop policy if exists "read member trips" on public.trips;
create policy "read member trips" on public.trips for select using (owner = auth.uid() or public.is_member(id));

drop policy if exists "insert own trips" on public.trips;
create policy "insert own trips" on public.trips for insert with check (owner = auth.uid() or public.is_member(id));

drop policy if exists "update member trips" on public.trips;
create policy "update member trips" on public.trips for update using (owner = auth.uid() or public.is_member(id)) with check (owner = auth.uid() or public.is_member(id));

drop policy if exists "delete own trips" on public.trips;
create policy "delete own trips" on public.trips for delete using (owner = auth.uid());

drop policy if exists "read own membership" on public.trip_members;
create policy "read own membership" on public.trip_members for select using (user_id = auth.uid() or public.is_member(trip_id));

drop policy if exists "leave trip" on public.trip_members;
create policy "leave trip" on public.trip_members for delete using (user_id = auth.uid() or exists (select 1 from public.trips t where t.id = trip_id and t.owner = auth.uid()));

drop policy if exists "members make invites" on public.trip_invites;
create policy "members make invites" on public.trip_invites for insert with check (public.is_member(trip_id));

drop policy if exists "members read invites" on public.trip_invites;
create policy "members read invites" on public.trip_invites for select using (public.is_member(trip_id));

drop policy if exists "members delete invites" on public.trip_invites;
create policy "members delete invites" on public.trip_invites for delete using (public.is_member(trip_id));

-- ---------- remove the old allowlist red tape ----------
drop policy if exists "allowed read allowlist" on public.allowed_emails;
drop table if exists public.allowed_emails cascade;
drop function if exists public.is_allowed();

-- ---------- realtime ----------
do $$ begin
  begin alter publication supabase_realtime add table public.trips; exception when duplicate_object then null; end;
end $$;
