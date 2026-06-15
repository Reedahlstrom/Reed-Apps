import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AppData,
  Briefing,
  Committee,
  DevoTime,
  Devotional,
  FollowUp,
  FoodDay,
  GroupSet,
  Meeting,
  Note,
  NoteCategory,
  Person,
  PoopNight,
  Role,
  Room,
  RoomPhase,
  RoomPlan,
  Trip,
} from '@/types/domain'
import { uid, uuid, UUID_RE } from '@/lib/id'
import { todayISO, todayPlusISO } from '@/lib/dates'
import { generateBusPods, generateGroups } from '@/lib/algorithms'

/* ---------------- factories ---------------- */

function newTrip(name: string, start: string, end: string, destination: string): Trip {
  const now = new Date().toISOString()
  return {
    id: uuid(),
    name,
    meta: { startDate: start, endDate: end, destination },
    people: [],
    foodDays: [],
    busDays: [],
    meetings: [],
    notes: [],
    roomPlans: [],
    groupSets: [],
    poopNights: [],
    committees: [],
    devotionals: [],
    briefing: { vision: '', rules: '', expectations: '' },
    flights: [],
    letters: [],
    onboarded: false,
    createdAt: now,
    updatedAt: now,
  }
}

/** Backfill fields added after a trip was first created (persist migration). */
function ensureTripShape(t: Trip): Trip {
  return {
    ...t,
    committees: t.committees ?? [],
    devotionals: t.devotionals ?? [],
    briefing: t.briefing ?? { vision: '', rules: '', expectations: '' },
    flights: t.flights ?? [],
    letters: t.letters ?? [],
    roomPlans: t.roomPlans ?? [],
    groupSets: t.groupSets ?? [],
    poopNights: t.poopNights ?? [],
  }
}

function defaultTrip(): Trip {
  // Generic starter — every leader sets their own in onboarding.
  return newTrip('My Trip', todayISO(), todayPlusISO(14), '')
}

/* ---------------- store shape ---------------- */

interface TripStore extends AppData {
  // trips
  createTrip: (name: string, start: string, end: string, destination: string) => string
  setActiveTrip: (id: string) => void
  renameTrip: (id: string, name: string) => void
  updateTripMeta: (patch: Partial<Trip['meta']>) => void
  deleteTrip: (id: string) => void
  setOnboarded: (v: boolean) => void
  /** Merge a trip received from another device (newer-wins). */
  applyRemoteTrip: (trip: Trip) => void

  // people
  addPerson: (name: string, role: Role) => void
  addPeople: (names: string[], role: Role) => void
  updatePerson: (id: string, patch: Partial<Pick<Person, 'name' | 'role'>>) => void
  removePerson: (id: string) => void

  // food
  addFoodDay: (date: string, label: string) => string
  removeFoodDay: (id: string) => void
  addMenuItem: (dayId: string, name: string, note?: string) => void
  removeMenuItem: (dayId: string, itemId: string) => void
  setOrder: (dayId: string, personId: string, itemId: string | null) => void

  // bus buddies
  generateBusDay: (date: string, label: string) => void
  reshuffleBusDay: (id: string) => void
  setBusPods: (id: string, pods: string[][]) => void
  toggleBusLock: (id: string) => void
  removeBusDay: (id: string) => void

  // meetings
  syncMeetings: () => void
  setMeetingStatus: (personId: string, status: Meeting['status']) => void
  setMeetingDate: (personId: string, date: string | undefined) => void
  setMeetingNotes: (personId: string, notes: string) => void
  addFollowUp: (personId: string, text: string) => void
  toggleFollowUp: (personId: string, followUpId: string) => void
  removeFollowUp: (personId: string, followUpId: string) => void

  // notes
  addNote: (category: NoteCategory, title: string, body: string, phone?: string) => void
  updateNote: (id: string, patch: Partial<Note>) => void
  removeNote: (id: string) => void
  toggleNotePin: (id: string) => void

  // rooms
  ensureRoomPlan: (phase: RoomPhase) => void
  addRoom: (phase: RoomPhase, name: string, beds: number) => void
  updateRoom: (phase: RoomPhase, roomId: string, patch: Partial<Pick<Room, 'name' | 'beds'>>) => void
  removeRoom: (phase: RoomPhase, roomId: string) => void
  assignToRoom: (phase: RoomPhase, personId: string, roomId: string | null) => void
  copyRoomPlan: (from: RoomPhase, to: RoomPhase) => void

  // groups
  generateGroupSet: (label: string, numGroups: number, activity?: string) => void
  reshuffleGroupSet: (id: string, numGroups: number) => void
  setGroups: (id: string, groups: string[][]) => void
  toggleGroupLock: (id: string) => void
  removeGroupSet: (id: string) => void

  // poop
  setPoopNight: (date: string, notPooped: string[]) => void
  togglePoop: (date: string, personId: string) => void
  toggleMedicated: (date: string, personId: string) => void

  // committees
  addCommittee: (name: string, purpose: string) => void
  updateCommittee: (id: string, patch: Partial<Pick<Committee, 'name' | 'purpose'>>) => void
  removeCommittee: (id: string) => void
  toggleCommitteeMember: (id: string, personId: string) => void
  addCommitteeNote: (id: string, text: string) => void
  removeCommitteeNote: (id: string, noteId: string) => void

  // devotionals + briefing
  addDevotional: (time: DevoTime) => string
  updateDevotional: (id: string, patch: Partial<Devotional>) => void
  removeDevotional: (id: string) => void
  toggleDevotionalDone: (id: string) => void
  setBriefing: (patch: Partial<Briefing>) => void

  // flights
  addFlight: (personId: string, code: string, date?: string, label?: string) => void
  removeFlight: (id: string) => void

  // letters
  toggleLetter: (personId: string) => void

  // sync housekeeping — drop empty seed trips once a real (synced) trip exists
  pruneEmptySeeds: () => void
}

/* ---------------- mutation helper ---------------- */

const EMPTY: AppData = { trips: [], activeTripId: null, rev: 0 }

function mutateActive(state: AppData, fn: (trip: Trip) => void): Partial<AppData> {
  const current = state.trips.find((t) => t.id === state.activeTripId)
  if (!current) return {}
  const draft: Trip = structuredClone(current)
  fn(draft)
  draft.updatedAt = new Date().toISOString()
  return {
    trips: state.trips.map((t) => (t.id === draft.id ? draft : t)),
    rev: state.rev + 1,
  }
}

/* ---------------- store ---------------- */

export const useTripStore = create<TripStore>()(
  persist(
    (set) => ({
      ...EMPTY,

      /* trips */
      createTrip: (name, start, end, destination) => {
        const trip = newTrip(name, start, end, destination)
        set((s) => ({ trips: [...s.trips, trip], activeTripId: trip.id, rev: s.rev + 1 }))
        return trip.id
      },
      setActiveTrip: (id) => set((s) => ({ activeTripId: id, rev: s.rev + 1 })),
      renameTrip: (id, name) =>
        set((s) => ({
          trips: s.trips.map((t) => (t.id === id ? { ...t, name } : t)),
          rev: s.rev + 1,
        })),
      updateTripMeta: (patch) =>
        set((s) => mutateActive(s, (t) => Object.assign(t.meta, patch))),
      deleteTrip: (id) =>
        set((s) => {
          const trips = s.trips.filter((t) => t.id !== id)
          const activeTripId =
            s.activeTripId === id ? (trips[0]?.id ?? null) : s.activeTripId
          return { trips, activeTripId, rev: s.rev + 1 }
        }),
      setOnboarded: (v) => set((s) => mutateActive(s, (t) => void (t.onboarded = v))),
      applyRemoteTrip: (incoming) =>
        set((s) => {
          const existing = s.trips.find((t) => t.id === incoming.id)
          if (existing && existing.updatedAt >= incoming.updatedAt) return {}
          const shaped = ensureTripShape(incoming)
          const trips = existing ? s.trips.map((t) => (t.id === incoming.id ? shaped : t)) : [...s.trips, shaped]
          return { trips, activeTripId: s.activeTripId ?? shaped.id, rev: s.rev + 1 }
        }),

      /* people */
      addPerson: (name, role) =>
        set((s) =>
          mutateActive(s, (t) => {
            t.people.push({ id: uid('p'), name: name.trim(), role, createdAt: new Date().toISOString() })
          }),
        ),
      addPeople: (names, role) =>
        set((s) =>
          mutateActive(s, (t) => {
            for (const raw of names) {
              const name = raw.trim()
              if (name) t.people.push({ id: uid('p'), name, role, createdAt: new Date().toISOString() })
            }
          }),
        ),
      updatePerson: (id, patch) =>
        set((s) =>
          mutateActive(s, (t) => {
            const p = t.people.find((x) => x.id === id)
            if (p) Object.assign(p, patch)
          }),
        ),
      removePerson: (id) =>
        set((s) =>
          mutateActive(s, (t) => {
            t.people = t.people.filter((p) => p.id !== id)
            // scrub references everywhere
            t.foodDays.forEach((d) => (d.orders = d.orders.filter((o) => o.personId !== id)))
            t.busDays.forEach((d) => (d.pods = d.pods.map((pod) => pod.filter((x) => x !== id)).filter((pod) => pod.length)))
            t.meetings = t.meetings.filter((m) => m.personId !== id)
            t.roomPlans.forEach((rp) => rp.rooms.forEach((r) => (r.occupants = r.occupants.filter((x) => x !== id))))
            t.groupSets.forEach((gs) => (gs.groups = gs.groups.map((g) => g.filter((x) => x !== id))))
            t.poopNights.forEach((n) => (n.notPooped = n.notPooped.filter((x) => x !== id)))
          }),
        ),

      /* food */
      addFoodDay: (date, label) => {
        const id = uid('food')
        set((s) =>
          mutateActive(s, (t) => {
            t.foodDays.push({ id, date, label, menu: [], orders: [], createdAt: new Date().toISOString() })
          }),
        )
        return id
      },
      removeFoodDay: (id) =>
        set((s) => mutateActive(s, (t) => void (t.foodDays = t.foodDays.filter((d) => d.id !== id)))),
      addMenuItem: (dayId, name, note) =>
        set((s) =>
          mutateActive(s, (t) => {
            const day = t.foodDays.find((d) => d.id === dayId)
            if (day) {
              const number = day.menu.length ? Math.max(...day.menu.map((m) => m.number)) + 1 : 1
              day.menu.push({ id: uid('m'), number, name: name.trim(), note })
            }
          }),
        ),
      removeMenuItem: (dayId, itemId) =>
        set((s) =>
          mutateActive(s, (t) => {
            const day = t.foodDays.find((d) => d.id === dayId)
            if (day) {
              day.menu = day.menu.filter((m) => m.id !== itemId)
              day.orders = day.orders.filter((o) => o.itemId !== itemId)
            }
          }),
        ),
      setOrder: (dayId, personId, itemId) =>
        set((s) =>
          mutateActive(s, (t) => {
            const day = t.foodDays.find((d) => d.id === dayId)
            if (!day) return
            day.orders = day.orders.filter((o) => o.personId !== personId)
            if (itemId) day.orders.push({ personId, itemId })
          }),
        ),

      /* bus buddies */
      generateBusDay: (date, label) =>
        set((s) =>
          mutateActive(s, (t) => {
            const ids = t.people.map((p) => p.id)
            const prior = t.busDays.filter((d) => d.locked).map((d) => d.pods)
            const pods = generateBusPods(ids, prior)
            t.busDays.push({ id: uid('bus'), date, label, pods, locked: false, createdAt: new Date().toISOString() })
          }),
        ),
      reshuffleBusDay: (id) =>
        set((s) =>
          mutateActive(s, (t) => {
            const day = t.busDays.find((d) => d.id === id)
            if (!day || day.locked) return
            const ids = t.people.map((p) => p.id)
            const prior = t.busDays.filter((d) => d.locked && d.id !== id).map((d) => d.pods)
            day.pods = generateBusPods(ids, prior)
          }),
        ),
      setBusPods: (id, pods) =>
        set((s) =>
          mutateActive(s, (t) => {
            const day = t.busDays.find((d) => d.id === id)
            if (day && !day.locked) day.pods = pods
          }),
        ),
      toggleBusLock: (id) =>
        set((s) =>
          mutateActive(s, (t) => {
            const day = t.busDays.find((d) => d.id === id)
            if (day) day.locked = !day.locked
          }),
        ),
      removeBusDay: (id) =>
        set((s) => mutateActive(s, (t) => void (t.busDays = t.busDays.filter((d) => d.id !== id)))),

      /* meetings */
      syncMeetings: () =>
        set((s) =>
          mutateActive(s, (t) => {
            const builders = t.people.filter((p) => p.role === 'builder')
            const have = new Set(t.meetings.map((m) => m.personId))
            for (const b of builders) {
              if (!have.has(b.id))
                t.meetings.push({ personId: b.id, status: 'pending', followUps: [], updatedAt: new Date().toISOString() })
            }
            // drop meetings for people no longer builders
            const builderIds = new Set(builders.map((b) => b.id))
            t.meetings = t.meetings.filter((m) => builderIds.has(m.personId))
          }),
        ),
      setMeetingStatus: (personId, status) =>
        set((s) =>
          mutateActive(s, (t) => {
            const m = t.meetings.find((x) => x.personId === personId)
            if (m) {
              m.status = status
              m.updatedAt = new Date().toISOString()
            }
          }),
        ),
      setMeetingDate: (personId, date) =>
        set((s) =>
          mutateActive(s, (t) => {
            const m = t.meetings.find((x) => x.personId === personId)
            if (m) {
              m.date = date
              if (date && m.status === 'pending') m.status = 'scheduled'
              if (!date && m.status === 'scheduled') m.status = 'pending'
              m.updatedAt = new Date().toISOString()
            }
          }),
        ),
      setMeetingNotes: (personId, notes) =>
        set((s) =>
          mutateActive(s, (t) => {
            const m = t.meetings.find((x) => x.personId === personId)
            if (m) {
              m.notes = notes
              m.updatedAt = new Date().toISOString()
            }
          }),
        ),
      addFollowUp: (personId, text) =>
        set((s) =>
          mutateActive(s, (t) => {
            const m = t.meetings.find((x) => x.personId === personId)
            if (m && text.trim()) {
              const fu: FollowUp = { id: uid('fu'), text: text.trim(), done: false }
              m.followUps.push(fu)
              m.updatedAt = new Date().toISOString()
            }
          }),
        ),
      toggleFollowUp: (personId, followUpId) =>
        set((s) =>
          mutateActive(s, (t) => {
            const m = t.meetings.find((x) => x.personId === personId)
            const fu = m?.followUps.find((f) => f.id === followUpId)
            if (fu) fu.done = !fu.done
          }),
        ),
      removeFollowUp: (personId, followUpId) =>
        set((s) =>
          mutateActive(s, (t) => {
            const m = t.meetings.find((x) => x.personId === personId)
            if (m) m.followUps = m.followUps.filter((f) => f.id !== followUpId)
          }),
        ),

      /* notes */
      addNote: (category, title, body, phone) =>
        set((s) =>
          mutateActive(s, (t) => {
            const now = new Date().toISOString()
            t.notes.unshift({ id: uid('n'), category, title: title.trim(), body, phone, pinned: false, createdAt: now, updatedAt: now })
          }),
        ),
      updateNote: (id, patch) =>
        set((s) =>
          mutateActive(s, (t) => {
            const n = t.notes.find((x) => x.id === id)
            if (n) Object.assign(n, patch, { updatedAt: new Date().toISOString() })
          }),
        ),
      removeNote: (id) =>
        set((s) => mutateActive(s, (t) => void (t.notes = t.notes.filter((n) => n.id !== id)))),
      toggleNotePin: (id) =>
        set((s) =>
          mutateActive(s, (t) => {
            const n = t.notes.find((x) => x.id === id)
            if (n) n.pinned = !n.pinned
          }),
        ),

      /* rooms */
      ensureRoomPlan: (phase) =>
        set((s) =>
          mutateActive(s, (t) => {
            if (!t.roomPlans.some((rp) => rp.phase === phase)) t.roomPlans.push({ phase, rooms: [] })
          }),
        ),
      addRoom: (phase, name, beds) =>
        set((s) =>
          mutateActive(s, (t) => {
            let rp = t.roomPlans.find((x) => x.phase === phase)
            if (!rp) {
              rp = { phase, rooms: [] }
              t.roomPlans.push(rp)
            }
            rp.rooms.push({ id: uid('room'), name: name.trim(), beds, occupants: [] })
          }),
        ),
      updateRoom: (phase, roomId, patch) =>
        set((s) =>
          mutateActive(s, (t) => {
            const room = t.roomPlans.find((x) => x.phase === phase)?.rooms.find((r) => r.id === roomId)
            if (room) Object.assign(room, patch)
          }),
        ),
      removeRoom: (phase, roomId) =>
        set((s) =>
          mutateActive(s, (t) => {
            const rp = t.roomPlans.find((x) => x.phase === phase)
            if (rp) rp.rooms = rp.rooms.filter((r) => r.id !== roomId)
          }),
        ),
      assignToRoom: (phase, personId, roomId) =>
        set((s) =>
          mutateActive(s, (t) => {
            const rp = t.roomPlans.find((x) => x.phase === phase)
            if (!rp) return
            rp.rooms.forEach((r) => (r.occupants = r.occupants.filter((x) => x !== personId)))
            if (roomId) {
              const room = rp.rooms.find((r) => r.id === roomId)
              if (room) room.occupants.push(personId)
            }
          }),
        ),
      copyRoomPlan: (from, to) =>
        set((s) =>
          mutateActive(s, (t) => {
            const src = t.roomPlans.find((x) => x.phase === from)
            if (!src) return
            const cloned: RoomPlan = {
              phase: to,
              rooms: src.rooms.map((r) => ({ ...r, id: uid('room'), occupants: [...r.occupants] })),
            }
            t.roomPlans = t.roomPlans.filter((x) => x.phase !== to)
            t.roomPlans.push(cloned)
          }),
        ),

      /* groups */
      generateGroupSet: (label, numGroups, activity) =>
        set((s) =>
          mutateActive(s, (t) => {
            const ids = t.people.map((p) => p.id)
            const prior = t.groupSets.filter((g) => g.locked).map((g) => g.groups)
            const groups = generateGroups(ids, numGroups, prior)
            t.groupSets.unshift({ id: uid('gs'), label: label.trim() || 'Groups', activity, groups, locked: false, createdAt: new Date().toISOString() })
          }),
        ),
      reshuffleGroupSet: (id, numGroups) =>
        set((s) =>
          mutateActive(s, (t) => {
            const gs = t.groupSets.find((g) => g.id === id)
            if (!gs || gs.locked) return
            const ids = t.people.map((p) => p.id)
            const prior = t.groupSets.filter((g) => g.locked && g.id !== id).map((g) => g.groups)
            gs.groups = generateGroups(ids, numGroups, prior)
          }),
        ),
      setGroups: (id, groups) =>
        set((s) =>
          mutateActive(s, (t) => {
            const gs = t.groupSets.find((g) => g.id === id)
            if (gs && !gs.locked) gs.groups = groups
          }),
        ),
      toggleGroupLock: (id) =>
        set((s) =>
          mutateActive(s, (t) => {
            const gs = t.groupSets.find((g) => g.id === id)
            if (gs) gs.locked = !gs.locked
          }),
        ),
      removeGroupSet: (id) =>
        set((s) => mutateActive(s, (t) => void (t.groupSets = t.groupSets.filter((g) => g.id !== id)))),

      /* poop */
      setPoopNight: (date, notPooped) =>
        set((s) =>
          mutateActive(s, (t) => {
            const existing = t.poopNights.find((n) => n.date === date)
            if (existing) existing.notPooped = notPooped
            else t.poopNights.push({ date, notPooped, createdAt: new Date().toISOString() })
          }),
        ),
      togglePoop: (date, personId) =>
        set((s) =>
          mutateActive(s, (t) => {
            let night = t.poopNights.find((n) => n.date === date)
            if (!night) {
              night = { date, notPooped: [], createdAt: new Date().toISOString() }
              t.poopNights.push(night)
            }
            // "toggle" here means toggle the DID-NOT-poop flag
            night.notPooped = night.notPooped.includes(personId)
              ? night.notPooped.filter((x) => x !== personId)
              : [...night.notPooped, personId]
          }),
        ),
      toggleMedicated: (date, personId) =>
        set((s) =>
          mutateActive(s, (t) => {
            let night = t.poopNights.find((n) => n.date === date)
            if (!night) {
              night = { date, notPooped: [], medicated: [], createdAt: new Date().toISOString() }
              t.poopNights.push(night)
            }
            const meds = night.medicated ?? []
            night.medicated = meds.includes(personId) ? meds.filter((x) => x !== personId) : [...meds, personId]
          }),
        ),

      /* committees */
      addCommittee: (name, purpose) =>
        set((s) =>
          mutateActive(s, (t) => {
            t.committees.push({ id: uid('cm'), name: name.trim() || 'Committee', purpose: purpose.trim(), memberIds: [], notes: [], createdAt: new Date().toISOString() })
          }),
        ),
      updateCommittee: (id, patch) =>
        set((s) =>
          mutateActive(s, (t) => {
            const c = t.committees.find((x) => x.id === id)
            if (c) Object.assign(c, patch)
          }),
        ),
      removeCommittee: (id) =>
        set((s) => mutateActive(s, (t) => void (t.committees = t.committees.filter((c) => c.id !== id)))),
      toggleCommitteeMember: (id, personId) =>
        set((s) =>
          mutateActive(s, (t) => {
            const c = t.committees.find((x) => x.id === id)
            if (c) c.memberIds = c.memberIds.includes(personId) ? c.memberIds.filter((x) => x !== personId) : [...c.memberIds, personId]
          }),
        ),
      addCommitteeNote: (id, text) =>
        set((s) =>
          mutateActive(s, (t) => {
            const c = t.committees.find((x) => x.id === id)
            if (c && text.trim()) c.notes.unshift({ id: uid('cn'), text: text.trim(), createdAt: new Date().toISOString() })
          }),
        ),
      removeCommitteeNote: (id, noteId) =>
        set((s) =>
          mutateActive(s, (t) => {
            const c = t.committees.find((x) => x.id === id)
            if (c) c.notes = c.notes.filter((n) => n.id !== noteId)
          }),
        ),

      /* devotionals + briefing */
      addDevotional: (time) => {
        const id = uid('dv')
        set((s) =>
          mutateActive(s, (t) => {
            const now = new Date().toISOString()
            t.devotionals.push({ id, time, title: '', giver: '', scriptures: [], ideas: '', done: false, createdAt: now, updatedAt: now })
          }),
        )
        return id
      },
      updateDevotional: (id, patch) =>
        set((s) =>
          mutateActive(s, (t) => {
            const d = t.devotionals.find((x) => x.id === id)
            if (d) Object.assign(d, patch, { updatedAt: new Date().toISOString() })
          }),
        ),
      removeDevotional: (id) =>
        set((s) => mutateActive(s, (t) => void (t.devotionals = t.devotionals.filter((d) => d.id !== id)))),
      toggleDevotionalDone: (id) =>
        set((s) =>
          mutateActive(s, (t) => {
            const d = t.devotionals.find((x) => x.id === id)
            if (d) d.done = !d.done
          }),
        ),
      setBriefing: (patch) =>
        set((s) => mutateActive(s, (t) => void Object.assign(t.briefing, patch))),

      /* flights */
      addFlight: (personId, code, date, label) =>
        set((s) =>
          mutateActive(s, (t) => {
            if (code.trim()) t.flights.push({ id: uid('fl'), personId, code: code.trim().toUpperCase().replace(/\s+/g, ''), date, label })
          }),
        ),
      removeFlight: (id) =>
        set((s) => mutateActive(s, (t) => void (t.flights = t.flights.filter((f) => f.id !== id)))),

      /* letters */
      toggleLetter: (personId) =>
        set((s) =>
          mutateActive(s, (t) => {
            t.letters = t.letters.includes(personId) ? t.letters.filter((x) => x !== personId) : [...t.letters, personId]
          }),
        ),

      /* sync housekeeping */
      pruneEmptySeeds: () =>
        set((s) => {
          const isReal = (t: Trip) => t.onboarded || t.people.length > 0
          if (!s.trips.some(isReal)) return {} // nothing real yet — keep the seed so onboarding works
          const trips = s.trips.filter(isReal)
          const activeTripId = trips.some((t) => t.id === s.activeTripId) ? s.activeTripId : trips[0].id
          return { trips, activeTripId, rev: s.rev + 1 }
        }),
    }),
    {
      name: 'reed-apps-trip-store',
      version: 2,
      migrate: (persisted) => {
        const s = persisted as AppData
        if (s?.trips) s.trips = s.trips.map(ensureTripShape)
        return s
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return
        // Backfill any fields added since the trip was created.
        state.trips = state.trips.map(ensureTripShape)
        // Trip ids MUST be UUIDs (the Postgres trips.id column). Migrate any
        // old "trip_…" ids to real UUIDs so they can sync, and keep activeTripId.
        const remap = new Map<string, string>()
        state.trips = state.trips.map((t) => {
          if (UUID_RE.test(t.id)) return t
          const id = uuid()
          remap.set(t.id, id)
          return { ...t, id }
        })
        if (state.activeTripId && remap.has(state.activeTripId)) {
          state.activeTripId = remap.get(state.activeTripId)!
        }
        // First run: seed a default trip so the app always has an active one.
        if (state.trips.length === 0) {
          const trip = defaultTrip()
          state.trips = [trip]
          state.activeTripId = trip.id
        }
      },
    },
  ),
)

/* ---------------- selectors ---------------- */

export function useActiveTrip(): Trip | null {
  return useTripStore((s) => s.trips.find((t) => t.id === s.activeTripId) ?? null)
}

/** Ensures there is always an active trip (used at app boot, outside React). */
export function ensureSeed(): void {
  const s = useTripStore.getState()
  if (s.trips.length === 0) {
    s.createTrip('My Trip', todayISO(), todayPlusISO(14), '')
  } else if (!s.activeTripId) {
    s.setActiveTrip(s.trips[0].id)
  }
}

export const todayKey = todayISO
export type { FoodDay, GroupSet, Note, PoopNight, Meeting }
