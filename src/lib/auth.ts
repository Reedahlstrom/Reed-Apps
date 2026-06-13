import { getSupabase } from './supabase'
import type { Session } from '@supabase/supabase-js'

/** Magic-link auth helpers. All safe no-ops when Supabase isn't configured. */

export async function getSession(): Promise<Session | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data } = await sb.auth.getSession()
  return data.session
}

export function onAuthChange(cb: (session: Session | null) => void): () => void {
  const sb = getSupabase()
  if (!sb) return () => {}
  const { data } = sb.auth.onAuthStateChange((_event, session) => cb(session))
  return () => data.subscription.unsubscribe()
}

export async function sendMagicLink(email: string): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Sync is not configured.' }
  const redirect = window.location.origin + import.meta.env.BASE_URL
  const { error } = await sb.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: redirect },
  })
  return error ? { ok: false, error: error.message } : { ok: true }
}

export async function signOut(): Promise<void> {
  const sb = getSupabase()
  await sb?.auth.signOut()
}

/**
 * Whether the signed-in email is on the trip allowlist. Returns false if the
 * backend isn't ready yet (table missing) so we can fall back to offline.
 */
export async function isEmailAllowed(): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  const { data, error } = await sb.from('allowed_emails').select('email').limit(1)
  if (error) return false
  return (data?.length ?? 0) > 0
}
