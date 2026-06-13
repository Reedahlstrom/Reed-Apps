import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase (Postgres) client.
 *
 * Returns `null` until both env vars are present, so the entire app runs
 * offline-first on localStorage. The moment credentials are added the sync
 * layer (lib/sync.ts) activates with zero code changes elsewhere.
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: { params: { eventsPerSecond: 5 } },
    })
  }
  return client
}
