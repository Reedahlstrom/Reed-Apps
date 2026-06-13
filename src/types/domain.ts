/**
 * Reed Apps — Trip Leader domain model.
 *
 * One Trip is a self-contained document. Everything (roster, food, bus buddies,
 * meetings, notes, rooms, groups, poop log) lives under a trip so that switching
 * to a new group (Trip 2) is just selecting a different trip — nothing is lost.
 */

export type Role = 'leader' | 'coleader' | 'parent' | 'builder'

export interface Person {
  id: string
  name: string
  role: Role
  /** Optional sort/display helpers */
  createdAt: string
}

/* ---------------- Food orders ---------------- */

export interface MenuItem {
  id: string
  /** Stable display number shown to the vendor (1, 2, 3 …) */
  number: number
  name: string
  note?: string
}

export interface FoodOrder {
  personId: string
  itemId: string
  note?: string
}

export interface FoodDay {
  id: string
  /** ISO date (yyyy-mm-dd) */
  date: string
  label: string
  menu: MenuItem[]
  orders: FoodOrder[]
  createdAt: string
}

/* ---------------- Bus buddies ---------------- */

/** A seating unit for a day — usually a pair, occasionally a trio when odd. */
export type BusPod = string[]

export interface BusDay {
  id: string
  date: string
  label: string
  pods: BusPod[]
  locked: boolean
  createdAt: string
}

/* ---------------- 2-on-1 meetings ---------------- */

export type MeetingStatus = 'pending' | 'scheduled' | 'done'

export interface FollowUp {
  id: string
  text: string
  done: boolean
}

export interface Meeting {
  personId: string
  status: MeetingStatus
  /** ISO date when scheduled / completed */
  date?: string
  /** Free-form notes from the conversation */
  notes?: string
  /** Action items / things to follow up on after the 2-on-1 */
  followUps: FollowUp[]
  updatedAt: string
}

/* ---------------- Notes ---------------- */

export type NoteCategory = 'note' | 'contact' | 'reminder'

export interface Note {
  id: string
  category: NoteCategory
  title: string
  body: string
  /** Contacts only */
  phone?: string
  pinned: boolean
  createdAt: string
  updatedAt: string
}

/* ---------------- Rooms ---------------- */

export type RoomPhase = 'first' | 'second'

export interface Room {
  id: string
  name: string
  beds: number
  occupants: string[]
}

export interface RoomPlan {
  phase: RoomPhase
  rooms: Room[]
}

/* ---------------- Random groups ---------------- */

export interface GroupSet {
  id: string
  label: string
  activity?: string
  date?: string
  groups: string[][]
  locked: boolean
  createdAt: string
}

/* ---------------- Poop tracker ---------------- */

/** Each night we record ONLY the people who did NOT poop that day. */
export interface PoopNight {
  date: string
  notPooped: string[]
  createdAt: string
}

/* ---------------- Trip ---------------- */

export interface TripMeta {
  startDate: string // yyyy-mm-dd
  endDate: string // yyyy-mm-dd
  destination: string
}

export interface Trip {
  id: string
  name: string
  meta: TripMeta
  people: Person[]
  foodDays: FoodDay[]
  busDays: BusDay[]
  meetings: Meeting[]
  notes: Note[]
  roomPlans: RoomPlan[]
  groupSets: GroupSet[]
  poopNights: PoopNight[]
  onboarded: boolean
  createdAt: string
  updatedAt: string
}

export interface AppData {
  trips: Trip[]
  activeTripId: string | null
  /** Bumped on every local mutation; used by the sync layer. */
  rev: number
}

export const ROLE_LABELS: Record<Role, string> = {
  leader: 'Trip Leader',
  coleader: 'Co-Leader',
  parent: 'Parent Builder',
  builder: 'Builder',
}
