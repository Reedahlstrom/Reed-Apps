import { getSupabase } from './supabase'
import type { Trip } from '@/types/domain'

/**
 * Cross-device sync bridge. One row per trip in `public.trips`
 * (id, name, rev:bigint, data:jsonb). Writes use OPTIMISTIC CONCURRENCY:
 * update only succeeds if the server `rev` matches what we last saw, so a
 * stale device can never silently overwrite newer data. On a rev conflict the
 * caller merges and retries. No-ops when Supabase isn't configured.
 */

interface TripRow {
  id: string
  name: string
  rev: number
  data: Trip
}

export interface PulledTrip {
  trip: Trip
  rev: number
}

export async function pullTrips(): Promise<PulledTrip[] | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb.from('trips').select('id, name, rev, data')
  if (error) {
    console.warn('[sync] pullTrips failed:', error.message)
    return null
  }
  return (data as TripRow[]).map((row) => ({ trip: row.data, rev: row.rev }))
}

export interface PushResult {
  ok: boolean
  rev?: number
  /** Server rev moved since we last read — caller must merge `remote` and retry. */
  conflict?: boolean
  remote?: Trip
  remoteRev?: number
  /** Transient (network) failure — caller may back off and retry. */
  network?: boolean
}

const isDuplicate = (msg: string) => /duplicate|already exists|23505|conflict/i.test(msg)

/**
 * Compare-and-swap write. `expectedRev` is the server rev we last saw for this
 * trip, or null if we believe it's new.
 */
export async function pushTrip(trip: Trip, expectedRev: number | null): Promise<PushResult> {
  const sb = getSupabase()
  if (!sb) return { ok: false }

  if (expectedRev != null) {
    const { data, error } = await sb
      .from('trips')
      .update({ name: trip.name, rev: expectedRev + 1, data: trip })
      .eq('id', trip.id)
      .eq('rev', expectedRev)
      .select('rev')
      .maybeSingle()
    if (error) return { ok: false, network: true }
    if (data) return { ok: true, rev: data.rev }
    // 0 rows updated → rev mismatch (conflict) or row vanished → fall through
  } else {
    const { data, error } = await sb
      .from('trips')
      .insert({ id: trip.id, name: trip.name, rev: 1, data: trip })
      .select('rev')
      .maybeSingle()
    if (!error && data) return { ok: true, rev: data.rev }
    if (error && !isDuplicate(error.message)) return { ok: false, network: true }
    // duplicate → it already exists, fall through to read & conflict
  }

  const { data: cur, error } = await sb.from('trips').select('rev, data').eq('id', trip.id).maybeSingle()
  if (error) return { ok: false, network: true }
  if (!cur) {
    const { data, error: ie } = await sb
      .from('trips')
      .insert({ id: trip.id, name: trip.name, rev: 1, data: trip })
      .select('rev')
      .maybeSingle()
    return ie ? { ok: false, network: true } : { ok: true, rev: data!.rev }
  }
  return { ok: false, conflict: true, remote: cur.data as Trip, remoteRev: cur.rev as number }
}

export async function deleteTripRemote(tripId: string): Promise<void> {
  const sb = getSupabase()
  if (!sb) return
  await sb.from('trips').delete().eq('id', tripId)
}

/**
 * Realtime postgres_changes on an RLS table only delivers events if the realtime
 * socket carries the signed-in user's JWT, so we set it explicitly.
 */
export async function primeRealtimeAuth(): Promise<void> {
  const sb = getSupabase()
  if (!sb) return
  const { data } = await sb.auth.getSession()
  if (data.session) sb.realtime.setAuth(data.session.access_token)
}

/** Subscribe to remote trip changes. Callback gets the trip + its new rev. */
export function subscribeTrips(onChange: (trip: Trip, rev: number) => void): () => void {
  const sb = getSupabase()
  if (!sb) return () => {}
  const channel = sb
    .channel('trips-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, (payload) => {
      const row = payload.new as TripRow | undefined
      if (row?.data) onChange(row.data, row.rev)
    })
    .subscribe()
  return () => {
    sb.removeChannel(channel)
  }
}
