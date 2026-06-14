import { getSupabase } from './supabase'

export interface Collaborator {
  email: string
  label: string | null
}

/** Who is allowed to sign in and see the shared trips (the email allowlist). */
export async function fetchCollaborators(): Promise<Collaborator[] | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb.from('allowed_emails').select('email, label').order('added_at')
  if (error) return null
  return data as Collaborator[]
}
