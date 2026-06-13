import { useEffect } from 'react'
import { useTripStore } from '@/store/useTripStore'
import { pullTrips, pushTrip, subscribeTrips } from '@/lib/sync'
import type { Trip } from '@/types/domain'

/**
 * Bridges the local store and Supabase once the user is signed in & allowed:
 *  1. Pull remote trips, merge newest-wins, then push any local-only/newer trips
 *     (so data entered offline today is never lost).
 *  2. Subscribe to realtime changes from the other leader's device.
 *  3. Debounce-push local mutations, skipping echoes of what we just received.
 */
export function SyncProvider({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return
    const store = useTripStore
    // updatedAt we last saw from the server per trip — used to suppress echoes.
    const remoteStamp = new Map<string, string>()
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const initial = async () => {
      const remote = await pullTrips()
      if (disposed || !remote) return
      const local = store.getState().trips
      const localById = new Map(local.map((t) => [t.id, t]))
      // apply remote → local
      for (const rt of remote) {
        remoteStamp.set(rt.id, rt.updatedAt)
        store.getState().applyRemoteTrip(rt)
      }
      // push local trips that are missing or newer remotely
      const remoteById = new Map(remote.map((t) => [t.id, t]))
      for (const lt of localById.values()) {
        const rt = remoteById.get(lt.id)
        if (!rt || lt.updatedAt > rt.updatedAt) {
          await pushTrip(lt)
          remoteStamp.set(lt.id, lt.updatedAt)
        }
      }
    }

    const unsubRealtime = subscribeTrips((trip: Trip) => {
      remoteStamp.set(trip.id, trip.updatedAt)
      store.getState().applyRemoteTrip(trip)
    })

    // push local changes (debounced)
    const unsubStore = store.subscribe((state) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        for (const t of state.trips) {
          if (remoteStamp.get(t.id) !== t.updatedAt) {
            remoteStamp.set(t.id, t.updatedAt)
            void pushTrip(t)
          }
        }
      }, 800)
    })

    // pull again on focus to catch anything missed while backgrounded
    const onFocus = () => void initial()
    window.addEventListener('focus', onFocus)

    void initial()

    return () => {
      disposed = true
      if (timer) clearTimeout(timer)
      unsubRealtime()
      unsubStore()
      window.removeEventListener('focus', onFocus)
    }
  }, [active])

  return null
}
