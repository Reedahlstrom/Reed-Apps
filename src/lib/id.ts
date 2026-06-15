/** A real UUID — REQUIRED for trip ids (the Postgres trips.id column is uuid). */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  // RFC4122-ish fallback (modern browsers always have crypto.randomUUID)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Short stable id for in-document entities (people, pods, notes…). */
export function uid(prefix = ''): string {
  const base = uuid()
  return prefix ? `${prefix}_${base}` : base
}
