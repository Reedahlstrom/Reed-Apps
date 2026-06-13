/**
 * Deterministic assignment algorithms for bus buddies and random groups.
 *
 * These exist to fix exactly what an LLM got wrong last year: forgetting names,
 * producing duplicates, and repeating yesterday's pairs. Pure combinatorics
 * cannot forget a name and provably minimizes repeats — running many randomized
 * restarts and keeping the lowest-repeat result (short-circuiting at zero).
 */

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Count how many times each unordered pair has shared a grouping. */
export function coOccurrence(history: string[][][]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const grouping of history) {
    for (const group of grouping) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const k = pairKey(group[i], group[j])
          counts.set(k, (counts.get(k) ?? 0) + 1)
        }
      }
    }
  }
  return counts
}

/** How many times two specific people have been grouped together. */
export function timesTogether(counts: Map<string, number>, a: string, b: string): number {
  return counts.get(pairKey(a, b)) ?? 0
}

/* ============================================================
   BUS BUDDIES — pairs (plus one trio when the count is odd)
   ============================================================ */

function scorePods(pods: string[][], counts: Map<string, number>): number {
  let s = 0
  for (const pod of pods) {
    for (let i = 0; i < pod.length; i++) {
      for (let j = i + 1; j < pod.length; j++) {
        s += counts.get(pairKey(pod[i], pod[j])) ?? 0
      }
    }
  }
  return s
}

function buildPods(ids: string[], counts: Map<string, number>): string[][] {
  const pool = shuffle(ids)
  const pods: string[][] = []
  while (pool.length > 1) {
    const a = pool.shift()!
    let bestIdx = 0
    let bestCost = Infinity
    for (let i = 0; i < pool.length; i++) {
      // tiny jitter breaks ties randomly so equal-cost partners vary day to day
      const cost = (counts.get(pairKey(a, pool[i])) ?? 0) + Math.random() * 0.01
      if (cost < bestCost) {
        bestCost = cost
        bestIdx = i
      }
    }
    const b = pool.splice(bestIdx, 1)[0]
    pods.push([a, b])
  }
  // Odd one out joins the pair where it has sat with people the least → trio
  if (pool.length === 1 && pods.length > 0) {
    const x = pool.shift()!
    let bestIdx = 0
    let bestCost = Infinity
    for (let i = 0; i < pods.length; i++) {
      const cost = pods[i].reduce((acc, m) => acc + (counts.get(pairKey(x, m)) ?? 0), 0)
      if (cost < bestCost) {
        bestCost = cost
        bestIdx = i
      }
    }
    pods[bestIdx].push(x)
  } else if (pool.length === 1) {
    pods.push([pool.shift()!])
  }
  return pods
}

/**
 * Generate bus pods for `peopleIds`, avoiding pairs that occurred in `priorDays`
 * (each prior day = an array of pods). Returns the lowest-repeat assignment found.
 */
export function generateBusPods(
  peopleIds: string[],
  priorDays: string[][][],
  attempts = 600,
): string[][] {
  if (peopleIds.length === 0) return []
  if (peopleIds.length === 1) return [[peopleIds[0]]]
  const counts = coOccurrence(priorDays)
  let best: string[][] = buildPods(peopleIds, counts)
  let bestScore = scorePods(best, counts)
  for (let t = 1; t < attempts && bestScore > 0; t++) {
    const candidate = buildPods(peopleIds, counts)
    const s = scorePods(candidate, counts)
    if (s < bestScore) {
      best = candidate
      bestScore = s
    }
  }
  return best
}

/* ============================================================
   RANDOM GROUPS — split N people into K balanced groups
   ============================================================ */

function buildGroups(ids: string[], k: number, counts: Map<string, number>): string[][] {
  const groups: string[][] = Array.from({ length: k }, () => [])
  const maxSize = Math.ceil(ids.length / k)
  for (const person of shuffle(ids)) {
    let bestIdx = 0
    let bestCost = Infinity
    for (let g = 0; g < k; g++) {
      if (groups[g].length >= maxSize) continue
      const cost =
        groups[g].reduce((acc, m) => acc + (counts.get(pairKey(person, m)) ?? 0), 0) +
        groups[g].length * 0.001 + // gently prefer smaller groups → balance
        Math.random() * 0.01
      if (cost < bestCost) {
        bestCost = cost
        bestIdx = g
      }
    }
    groups[bestIdx].push(person)
  }
  return groups
}

/**
 * Split `peopleIds` into `numGroups` balanced groups, minimizing repeats vs.
 * prior group sets. Returns the lowest-repeat assignment found.
 */
export function generateGroups(
  peopleIds: string[],
  numGroups: number,
  priorSets: string[][][],
  attempts = 400,
): string[][] {
  const k = Math.max(1, Math.min(numGroups, peopleIds.length))
  if (peopleIds.length === 0) return Array.from({ length: k }, () => [])
  const counts = coOccurrence(priorSets)
  let best = buildGroups(peopleIds, k, counts)
  let bestScore = scorePods(best, counts)
  for (let t = 1; t < attempts && bestScore > 0; t++) {
    const candidate = buildGroups(peopleIds, k, counts)
    const s = scorePods(candidate, counts)
    if (s < bestScore) {
      best = candidate
      bestScore = s
    }
  }
  return best
}
