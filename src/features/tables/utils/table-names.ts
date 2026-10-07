import type { ApiError } from '@/shared/types/api'

/**
 * Names for a run of numbered tables: "Table 1" to "Table 12". The prefix is
 * the owner's ("Table", "Terrace"), so it reads in their language.
 */
export function numberedNames(prefix: string, from: number, to: number): string[] {
  const label = prefix.trim()
  const names: string[] = []
  for (let number = from; number <= to; number++) {
    names.push(label === '' ? String(number) : `${label} ${number}`)
  }
  return names
}

/**
 * The number after the highest one the tables already end in, so adding
 * more carries on from "Table 12" with 13 rather than starting over.
 */
export function nextNumber(names: readonly string[]): number {
  let highest = 0
  for (const name of names) {
    const match = /(\d+)\s*$/.exec(name)
    if (match) highest = Math.max(highest, Number(match[1]))
  }
  return highest + 1
}

/** The words before a table's number, from the last table that has one. */
export function lastPrefix(names: readonly string[]): string | null {
  for (let index = names.length - 1; index >= 0; index--) {
    const match = /^(.*?)\s*\d+\s*$/.exec(names[index] ?? '')
    if (match) return match[1] ?? ''
  }
  return null
}

/** The server's first complaint, whichever table of a run it is about. */
export function firstMessage(error: ApiError): string {
  const first = error.errors ? Object.values(error.errors)[0]?.[0] : undefined
  return first ?? error.message
}
