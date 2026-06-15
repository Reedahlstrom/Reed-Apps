-- Preview a trip from an invite code before joining (name + roster size).
create or replace function public.peek_invite(invite_code text)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when t.id is null then null else jsonb_build_object(
    'trip_id', t.id,
    'name', t.name,
    'people', coalesce(jsonb_array_length(t.data -> 'people'), 0)
  ) end
  from public.trip_invites i
  left join public.trips t on t.id = i.trip_id
  where i.code = invite_code and (i.expires_at is null or i.expires_at > now())
  limit 1;
$$;
grant execute on function public.peek_invite(text) to anon, authenticated;
