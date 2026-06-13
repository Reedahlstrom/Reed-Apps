import { getSupabase } from './supabase'
import { useTripStore } from '@/store/useTripStore'
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
  }
  return tripId as string
}
