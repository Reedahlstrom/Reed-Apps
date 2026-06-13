import type { PoopNight } from '@/types/domain'

export type PoopLevel = 'good' | 'warn' | 'bad'

export interface PoopStatus {
  level: PoopLevel
  /** Consecutive most-recent logged nights the person was marked "did not go". */
  days: number
}

/**
 * We only ever record who did NOT poop each night. So on any logged night, a
 * person who is absent from `notPooped` DID go. The streak is the run of the
 * most recent consecutive logged nights where they were marked as not going.
 *
 *   0–1 days → good (green)   ·   2 days → warn (amber)   ·   3+ days → bad (red)
 */
export function poopStatusFor(personId: string, nights: PoopNight[], today: string): PoopStatus {
  const logged = nights
    .filter((n) => n.date <= today)
    .sort((a, b) => (a.date < b.date ? -1 : 1))

  let streak = 0
  for (let i = logged.length - 1; i >= 0; i--) {
    if (logged[i].notPooped.includes(personId)) streak++
    else break
  }

  const level: PoopLevel = streak >= 3 ? 'bad' : streak === 2 ? 'warn' : 'good'
  return { level, days: streak }
}

export const POOP_COPY: Record<PoopLevel, string> = {
  good: 'Regular',
  warn: 'Keep an eye out',
  bad: 'Not good',
}
