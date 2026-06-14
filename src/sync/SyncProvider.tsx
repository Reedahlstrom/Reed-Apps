import { useEffect } from 'react'
import { useTripStore } from '@/store/useTripStore'
import { pullTrips, pushTrip, subscribeTrips } from '@/lib/sync'
import type { Trip } from '@/types/domain'

/** A trip with no roster and not onboarded is just the local default seed. */
const isReal = (t: Trip) => t.onboarded || t.people.length > 0

/**
 * Keeps the local store and Supabase in lockstep so both leaders work on ONE
 * living trip:
 *  - Pull first. Adopt remote trips, then prune the local empty seed so we never
 *    end up with a duplicate "looks the same but isn't" trip.
 *  - Push only REAL trips (never the empty seed) — newest-wins by updatedAt.
 *  - Realtime + focus/visibility pulls keep it as live as possible.
 */
export function SyncProvider({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return
    const store = useTripStore
    const remoteStamp = new Map<string, string>() // last updatedAt seen from server, to suppress echoes
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const adopt = (trips: Trip[]) => {
      for (const rt of trips) {
        remoteStamp.set(rt.id, rt.updatedAt)
        store.getState().applyRemoteTrip(rt)
      }
      store.getState().pruneEmptySeeds()
    }

    const pull = async () => {
      const remote = await pullTrips()
      if (disposed || !remote) return
      adopt(remote)
      // push real local trips that are missing remotely or newer than the server
      const remoteById = new Map(remote.map((t) => [t.id, t]))
      for (const lt of store.getState().trips) {
        if (!isReal(lt)) continue
        const rt = remoteById.get(lt.id)
        if (!rt || lt.updatedAt > rt.updatedAt) {
          if (await pushTrip(lt)) remoteStamp.set(lt.id, lt.updatedAt)
        }
      }
    }

    const unsubRealtime = subscribeTrips((trip) => {
      remoteStamp.set(trip.id, trip.updatedAt)
      store.getState().applyRemoteTrip(trip)
      store.getState().pruneEmptySeeds()
    })

    // push local changes (debounced); never push the empty seed
    const unsubStore = store.subscribe((state) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        for (const t of state.trips) {
          if (isReal(t) && remoteStamp.get(t.id) !== t.updatedAt) {
            remoteStamp.set(t.id, t.updatedAt)
            void pushTrip(t)
          }
        }
      }, 500)
    })

    const onWake = () => { if (document.visibilityState === 'visible') void pull() }
    window.addEventListener('focus', onWake)
    document.addEventListener('visibilitychange', onWake)

    void pull()

    return () => {
      disposed = true
      if (timer) clearTimeout(timer)
      unsubRealtime()
      unsubStore()
      window.removeEventListener('focus', onWake)
      document.removeEventListener('visibilitychange', onWake)
    }
  }, [active])

  return null
}
