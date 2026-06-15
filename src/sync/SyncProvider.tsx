import { useEffect } from 'react'
import { useTripStore } from '@/store/useTripStore'
import { pullTrips, pushTrip, subscribeTrips, primeRealtimeAuth } from '@/lib/sync'
import { onAuthChange } from '@/lib/auth'
import { useSyncStatus } from '@/sync/status'
import type { Trip } from '@/types/domain'

const isReal = (t: Trip) => t.onboarded || t.people.length > 0
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Keeps the local store and Supabase in lockstep, safely, for many co-editing
 * leaders:
 *  - Reads merge (union) into the store — a remote update never wipes local edits.
 *  - Writes use compare-and-swap on `rev`; on a conflict we merge the server's
 *    copy in and retry, so simultaneous edits can't clobber each other.
 *  - Surfaces a sync status (saving / synced / offline) and retries on failure.
 */
export function SyncProvider({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return
    const store = useTripStore
    const status = useSyncStatus.getState()
    const revMap = new Map<string, number>() // server rev we last saw per trip
    const lastStamp = new Map<string, string>() // updatedAt we last synced (push or pull)
    const pushing = new Set<string>()
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const unsynced = () =>
      store.getState().trips.filter((t) => isReal(t) && t.updatedAt !== lastStamp.get(t.id))

    const refreshStatus = () => {
      const n = unsynced().length
      status.setPending(n)
      if (pushing.size > 0) status.set('saving')
      else if (n === 0) status.set('synced')
      else status.set(navigator.onLine ? 'saving' : 'offline')
    }

    // apply a remote version: merge into local, record its rev + stamp
    const applyRemote = (trip: Trip, rev: number) => {
      revMap.set(trip.id, rev)
      lastStamp.set(trip.id, trip.updatedAt) // we're synced up to the remote stamp
      store.getState().applyRemoteTrip(trip)
    }

    const pushOne = async (id: string) => {
      if (pushing.has(id) || !navigator.onLine) return
      pushing.add(id)
      refreshStatus()
      try {
        for (let attempt = 0; attempt < 6 && !disposed; attempt++) {
          const t = store.getState().trips.find((x) => x.id === id)
          if (!t || !isReal(t)) break
          const expected = revMap.has(id) ? revMap.get(id)! : null
          const res = await pushTrip(t, expected)
          if (res.ok) {
            revMap.set(id, res.rev!)
            lastStamp.set(id, t.updatedAt)
            break
          }
          if (res.conflict && res.remote) {
            // someone else wrote first → merge their copy in, then retry
            applyRemote(res.remote, res.remoteRev!)
            continue
          }
          if (res.network) {
            await sleep(Math.min(8000, 500 * 2 ** attempt))
            continue
          }
          break
        }
      } finally {
        pushing.delete(id)
        refreshStatus()
      }
    }

    const flush = () => {
      for (const t of store.getState().trips) {
        if (isReal(t) && t.updatedAt !== lastStamp.get(t.id)) void pushOne(t.id)
      }
      refreshStatus()
    }

    const pull = async () => {
      status.set('saving')
      const remote = await pullTrips()
      if (disposed || !remote) { refreshStatus(); return }
      for (const { trip, rev } of remote) applyRemote(trip, rev)
      store.getState().pruneEmptySeeds()
      flush() // push local-only trips + any local edits newer than the server
    }

    const unsubRealtime0 = { fn: () => {} }
    void (async () => {
      await primeRealtimeAuth()
      if (disposed) return
      unsubRealtime0.fn = subscribeTrips((trip, rev) => {
        applyRemote(trip, rev)
        store.getState().pruneEmptySeeds()
        flush()
      })
    })()
    const unsubAuth = onAuthChange(() => void primeRealtimeAuth())

    // push local changes (debounced)
    const unsubStore = store.subscribe(() => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(flush, 400)
    })

    const onWake = () => { if (document.visibilityState === 'visible') void pull() }
    const onOnline = () => flush()
    window.addEventListener('focus', onWake)
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', refreshStatus)

    void pull()

    return () => {
      disposed = true
      if (timer) clearTimeout(timer)
      unsubRealtime0.fn()
      unsubStore()
      unsubAuth()
      window.removeEventListener('focus', onWake)
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', refreshStatus)
    }
  }, [active])

  return null
}
