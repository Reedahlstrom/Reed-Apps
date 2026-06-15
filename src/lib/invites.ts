import { getSupabase } from './supabase'
import { useTripStore } from '@/store/useTripStore'
import { UUID_RE } from '@/lib/id'
import type { Trip } from '@/types/domain'

/** Short, unambiguous invite code (no O/0/I/1). */
function makeCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)]
  return s
}

export function inviteLink(code: string): string {
  return `${window.location.origin}/join/${code}`
}

/** Create an invite for a trip; returns the code (or null if not signed in). */
export async function createInvite(tripId: string): Promise<string | null> {
  const sb = getSupabase()
  if (!sb) return null
  const code = makeCode()
  const { error } = await sb.from('trip_invites').insert({ code, trip_id: tripId })
  if (error) {
    console.warn('[invites] create failed:', error.message)
    return null
  }
  return code
}

/** The trip's shareable code — reuses an existing one or makes one. */
export async function getOrCreateTripCode(tripId: string): Promise<string | null> {
  const sb = getSupabase()
  if (!sb || !UUID_RE.test(tripId)) return null // not signed-in / not synced yet
  const { data } = await sb.from('trip_invites').select('code').eq('trip_id', tripId).limit(1)
  if (data && data.length) return data[0].code as string
  return createInvite(tripId)
}

export interface TripPeek {
  trip_id: string
  name: string
  people: number
}

/** Look up a trip by code WITHOUT joining — to confirm before joining. */
export async function peekInvite(code: string): Promise<TripPeek | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb.rpc('peek_invite', { invite_code: code.trim().toUpperCase() })
  if (error || !data) return null
  return data as TripPeek
}

/**
 * Redeem an invite: join the trip, pull it into the local store, make it active.
 * Returns the trip id on success.
 */
export async function redeemInvite(code: string): Promise<string | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data: tripId, error } = await sb.rpc('redeem_invite', { invite_code: code.trim().toUpperCase() })
  if (error || !tripId) {
    console.warn('[invites] redeem failed:', error?.message)
    return null
  }
  const { data: row } = await sb.from('trips').select('data').eq('id', tripId).maybeSingle()
  if (row?.data) {
    useTripStore.getState().applyRemoteTrip(row.data as Trip)
    useTripStore.getState().setActiveTrip(tripId as string)
    useTripStore.getState().pruneEmptySeeds() // drop the joiner's empty starter trip
  }
  return tripId as string
}
