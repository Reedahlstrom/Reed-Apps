import clsx, { type ClassValue } from 'clsx'

/** Thin wrapper so every component imports the same class combiner. */
export function cx(...inputs: ClassValue[]): string {
  return clsx(inputs)
}
