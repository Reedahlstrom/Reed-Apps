import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useActiveTrip } from '@/store/useTripStore'

/** Sends the user through onboarding until the active trip has a roster set up. */
export function RequireOnboarded({ children }: { children: ReactNode }) {
  const trip = useActiveTrip()
  if (!trip) return <Navigate to="/" replace />
  if (!trip.onboarded) return <Navigate to="/trip/onboarding" replace />
  return <>{children}</>
}
