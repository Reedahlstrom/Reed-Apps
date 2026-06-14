-- ============================================================
-- Reed Apps — RLS recursion FIX + collaboration hardening
-- Project: xfspyweaegrxibrryfgg
-- Run this whole script in Supabase → SQL Editor → Run.
--
-- Bug it fixes: is_allowed() read allowed_emails, and allowed_emails' own RLS
-- called is_allowed() again → infinite recursion → "stack depth limit exceeded"
-- (HTTP 500) on every authenticated read. Marking the function SECURITY DEFINER
-- makes it bypass RLS internally, breaking the loop. Idempotent — safe to re-run.
-- ============================================================

-- 1) The allowlist check, now SECURITY DEFINER (no recursion).
create or replace function public.is_allowed()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.allowed_emails a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- 2) Make sure RLS is on and the policies are correct.
alter table public.trips enable row level security;
alter table public.allowed_emails enable row level security;

drop policy if exists "allowed read trips" on public.trips;
create policy "allowed read trips" on public.trips for select using (public.is_allowed());

drop policy if exists "allowed insert trips" on public.trips;
create policy "allowed insert trips" on public.trips for insert with check (public.is_allowed());

drop policy if exists "allowed update trips" on public.trips;
create policy "allowed update trips" on public.trips for update using (public.is_allowed()) with check (public.is_allowed());

drop policy if exists "allowed delete trips" on public.trips;
create policy "allowed delete trips" on public.trips for delete using (public.is_allowed());

drop policy if exists "allowed read allowlist" on public.allowed_emails;
create policy "allowed read allowlist" on public.allowed_emails for select using (public.is_allowed());

-- 3) Realtime so both phones update live (safe if already added).
do $$
begin
  begin
    alter publication supabase_realtime add table public.trips;
  exception when duplicate_object then null;
  end;
end $$;

-- 4) Make sure Reed is allowlisted. (Co-leaders' real emails get added
--    separately — leave these as-is.)
insert into public.allowed_emails (email, label)
values ('reedahlstrom@gmail.com', 'Reed — Leader')
on conflict (email) do nothing;
