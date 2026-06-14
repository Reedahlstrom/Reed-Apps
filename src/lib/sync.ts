import { getSupabase } from './supabase'
import type { Trip } from '@/types/domain'

/**
 * Cross-device sync bridge.
 *
 * Each Trip maps to one row in `public.trips` (id, name, rev, data=JSONB).
 * Strategy: last-write-wins by `rev`, with a realtime subscription so the
 * co-leader's device updates live. Every function is a safe no-op when
 * Supabase is not configured, so the rest of the app never branches on it.
 */

interface TripRow {
  id: string
  name: string
  rev: number
  data: Trip
}

export async function pullTrips(): Promise<Trip[] | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb.from('trips').select('id, name, rev, data')
  if (error) {
    console.warn('[sync] pullTrips failed:', error.message)
    return null
  }
  return (data as TripRow[]).map((row) => row.data)
}

export async function pushTrip(trip: Trip): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  const { error } = await sb.from('trips').upsert(
    {
      id: trip.id,
      name: trip.name,
      rev: Date.parse(trip.updatedAt) || 0,
      data: trip,
    },
    { onConflict: 'id' },
  )
  if (error) {
    console.warn('[sync] pushTrip failed:', error.message)
    return false
  }
  return true
}

export async function deleteTripRemote(tripId: string): Promise<void> {
  const sb = getSupabase()
  if (!sb) return
  await sb.from('trips').delete().eq('id', tripId)
}

/**
 * Realtime postgres_changes on an RLS table only delivers events if the realtime
 * socket carries the signed-in user's JWT. supabase-js doesn't always propagate
 * it in time, so we set it explicitly before subscribing (and on token refresh).
 */
export async function primeRealtimeAuth(): Promise<void> {
  const sb = getSupabase()
  if (!sb) return
  const { data } = await sb.auth.getSession()
  if (data.session) sb.realtime.setAuth(data.session.access_token)
}

/** Subscribe to remote trip changes. Returns an unsubscribe function. */
export function subscribeTrips(onChange: (trip: Trip) => void): () => void {
  const sb = getSupabase()
  if (!sb) return () => {}
  const channel = sb
    .channel('trips-sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'trips' },
      (payload) => {
        const row = payload.new as TripRow | undefined
        if (row?.data) onChange(row.data)
      },
    )
    .subscribe()
  return () => {
    sb.removeChannel(channel)
  }
}
