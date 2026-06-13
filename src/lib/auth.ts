import { getSupabase } from './supabase'
import type { Session } from '@supabase/supabase-js'

/** Simple email + password auth. No codes, no email step (confirm-email off). */

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

export async function signIn(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Sync is not set up.' }
  const { error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
  return error ? { ok: false, error: error.message } : { ok: true }
}

export async function signUp(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Sync is not set up.' }
  const e = email.trim().toLowerCase()
  const { data, error } = await sb.auth.signUp({ email: e, password })
  if (error) {
    // Already registered → just sign them in.
    if (/already registered|already exists/i.test(error.message)) return signIn(e, password)
    return { ok: false, error: error.message }
  }
  // If a session came back, they're signed straight in. If not (confirm-email
  // still on), try an immediate sign-in so the flow stays seamless.
  if (!data.session) {
    const r = await signIn(e, password)
    if (!r.ok && /not confirmed/i.test(r.error ?? '')) {
      return { ok: false, error: 'Account created — check your email to confirm, then tap Sign in.' }
    }
    return r
  }
  return { ok: true }
}

export async function signOut(): Promise<void> {
  const sb = getSupabase()
  await sb?.auth.signOut()
}

export async function currentUserEmail(): Promise<string | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data } = await sb.auth.getUser()
  return data.user?.email ?? null
}
