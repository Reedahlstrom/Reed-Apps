import {
  eachDayOfInterval,
  format,
  isValid,
  parseISO,
  differenceInCalendarDays,
} from 'date-fns'

/** yyyy-mm-dd for "today" in the user's local timezone. */
export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function toISO(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function parse(iso: string): Date {
  const d = parseISO(iso)
  return isValid(d) ? d : new Date()
}

/** "Sun, Jun 15" */
export function prettyShort(iso: string): string {
  return format(parse(iso), 'EEE, MMM d')
}

/** "June 15" */
export function prettyDay(iso: string): string {
  return format(parse(iso), 'MMMM d')
}

/** "Mon" */
export function weekday(iso: string): string {
  return format(parse(iso), 'EEE')
}

/** "15" */
export function dayNum(iso: string): string {
  return format(parse(iso), 'd')
}

/** All ISO dates between start and end inclusive. */
export function tripDays(startISO: string, endISO: string): string[] {
  try {
    return eachDayOfInterval({ start: parse(startISO), end: parse(endISO) }).map(toISO)
  } catch {
    return []
  }
}

/** Positive number of days between two ISO dates (a - b). */
export function daysBetween(aISO: string, bISO: string): number {
  return differenceInCalendarDays(parse(aISO), parse(bISO))
}

/** Which trip day number a date falls on (1-indexed), or null if outside. */
export function tripDayNumber(iso: string, startISO: string, endISO: string): number | null {
  const all = tripDays(startISO, endISO)
  const i = all.indexOf(iso)
  return i === -1 ? null : i + 1
}
