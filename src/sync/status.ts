import { create } from 'zustand'

export type SyncState = 'idle' | 'saving' | 'synced' | 'offline'

interface SyncStatusStore {
  state: SyncState
  /** Local changes not yet confirmed on the server. */
  pending: number
  set: (state: SyncState) => void
  setPending: (pending: number) => void
}

/** Lightweight, app-wide sync indicator the shell reads. */
export const useSyncStatus = create<SyncStatusStore>((set) => ({
  state: 'idle',
  pending: 0,
  set: (state) => set({ state }),
  setPending: (pending) => set({ pending }),
}))
