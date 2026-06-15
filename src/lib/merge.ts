import type { Trip } from '@/types/domain'

/**
 * Merge two versions of a trip so concurrent edits never clobber each other.
 * Strategy: UNION every list by id/key (so adds from either side are kept — the
 * "builder disappeared" failure can't happen), deep-merging the sub-lists that
 * two leaders realistically touch at the same time (food orders, follow-ups,
 * committee members, room occupants, nightly health). For a genuine same-item
 * edit, the side with the newer trip timestamp wins. Scalars take the newer side.
 *
 * Trade-off: a delete on one side can be "resurrected" if the other side still
 * had the item — acceptable, because losing an ADD is far worse than re-deleting.
 */

const stamp = (t: { updatedAt: string }) => Date.parse(t.updatedAt) || 0

function uniq(a: string[] = [], b: string[] = []): string[] {
  return [...new Set([...a, ...b])]
}

/** Union two lists by key. `older` first so `newer` wins on key collisions. */
function unionBy<T>(older: T[] = [], newer: T[] = [], key: (x: T) => string, mergeItem?: (o: T, n: T) => T): T[] {
  const map = new Map<string, T>()
  for (const x of older) map.set(key(x), x)
  for (const y of newer) {
    const k = key(y)
    const ex = map.get(k)
    map.set(k, ex && mergeItem ? mergeItem(ex, y) : y)
  }
  return [...map.values()]
}

export function mergeTrips(a: Trip, b: Trip): Trip {
  const newer = stamp(a) >= stamp(b) ? a : b
  const older = newer === a ? b : a
  const U = <T>(sel: (t: Trip) => T[] | undefined, key: (x: T) => string, mItem?: (o: T, n: T) => T) =>
    unionBy(sel(older) ?? [], sel(newer) ?? [], key, mItem)

  return {
    ...newer, // scalars: id, name, meta, briefing, onboarded, createdAt
    updatedAt: new Date(Math.max(stamp(a), stamp(b))).toISOString(),

    people: U((t) => t.people, (p) => p.id),
    notes: U((t) => t.notes, (n) => n.id),
    busDays: U((t) => t.busDays, (d) => d.id),
    groupSets: U((t) => t.groupSets, (g) => g.id),
    devotionals: U((t) => t.devotionals, (d) => d.id),
    flights: U((t) => t.flights, (f) => f.id),
    prayers: U((t) => t.prayers, (p) => p.id),

    // both leaders may take orders on the same meal at once → union menu + orders
    foodDays: U((t) => t.foodDays, (d) => d.id, (o, n) => ({
      ...n,
      menu: unionBy(o.menu, n.menu, (m) => m.id),
      orders: unionBy(o.orders, n.orders, (x) => x.personId),
    })),

    // follow-ups can be added by either leader for the same kid
    meetings: U((t) => t.meetings, (m) => m.personId, (o, n) => ({
      ...n,
      followUps: unionBy(o.followUps, n.followUps, (f) => f.id),
    })),

    committees: U((t) => t.committees, (c) => c.id, (o, n) => ({
      ...n,
      memberIds: uniq(o.memberIds, n.memberIds),
      notes: unionBy(o.notes, n.notes, (x) => x.id),
    })),

    roomPlans: U((t) => t.roomPlans, (r) => r.phase, (o, n) => ({
      ...n,
      rooms: unionBy(o.rooms, n.rooms, (rm) => rm.id),
    })),

    // nightly health: union the "didn't go" + medicated sets per date
    poopNights: U((t) => t.poopNights, (x) => x.date, (o, n) => ({
      ...n,
      notPooped: uniq(o.notPooped, n.notPooped),
      medicated: uniq(o.medicated, n.medicated),
    })),

    letters: uniq(a.letters, b.letters),
  }
}
