import { getSupabase } from './supabase'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** How many people (owner + invited co-leaders) have access to this trip. */
export async function fetchMemberCount(tripId: string): Promise<number | null> {
  const sb = getSupabase()
  if (!sb || !UUID.test(tripId)) return null // not synced yet / demo seed
  const { count, error } = await sb.from('trip_members').select('*', { count: 'exact', head: true }).eq('trip_id', tripId)
  if (error) return null
  return count ?? 0
}
