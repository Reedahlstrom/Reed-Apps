import type { ReactNode } from 'react'

/**
 * AuthGate — wraps the app.
 *
 * Phase 8.5 will turn this into a magic-link sign-in wall (active only when
 * Supabase is configured). For now it passes through so the app is fully
 * usable offline-first while the rest of the features are built.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  return <>{children}</>
}
