import { useSyncExternalStore } from 'react'
import { env } from '@/config/env'
import { reportError } from '@/lib/api/report-error'

/**
 * What became of a request that came back with nothing the page could read:
 * `blocked` when the server's site was reachable all along, so something in
 * front of the app refused it (the host's bot protection answers without the
 * CORS headers, which the browser shows as no answer at all); `offline` when
 * the phone could not reach it.
 */
type Unanswered = 'blocked' | 'offline'

/** A small file Cloudflare keeps: asking for it costs the server nothing. */
const PROBE = `${env.VITE_API_URL}/favicon.ico`
const QUEUE_KEY = 'qayema.dashboard.unanswered.v1'
const QUEUE_LIMIT = 20

let last: Unanswered | null = null
let checking: Promise<Unanswered> | null = null
const listeners = new Set<() => void>()

type Note = { kind: Unanswered; path: string; at: string }

function readQueue(): Note[] {
  try {
    const notes: unknown = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]')
    return Array.isArray(notes) ? (notes as Note[]) : []
  } catch {
    return []
  }
}

/**
 * Whether the stored queue may hold notes: true until it has been read once
 * (notes from a page load before this one wait there), then only after a
 * note is written. Every answered request asks, and this keeps that from
 * reading storage each time.
 */
let mayHoldNotes = true

function writeQueue(notes: Note[]): void {
  mayHoldNotes = notes.length > 0
  try {
    if (notes.length === 0) localStorage.removeItem(QUEUE_KEY)
    else localStorage.setItem(QUEUE_KEY, JSON.stringify(notes.slice(-QUEUE_LIMIT)))
  } catch {
    // Blocked site data simply loses the notes.
  }
}

/**
 * Asks for the probe the simplest way a page can (`no-cors`, no cookies):
 * the browser hides the answer but says whether one came. One check at a
 * time, however many requests failed together. The result is kept for the
 * screen to read, and noted to be reported once a request gets through.
 */
export function checkUnanswered(path: string): Promise<Unanswered> {
  checking ??= (async () => {
    let kind: Unanswered = 'offline'
    if (navigator.onLine) {
      try {
        await fetch(PROBE, { mode: 'no-cors', credentials: 'omit', cache: 'no-store' })
        kind = 'blocked'
      } catch {
        kind = 'offline'
      }
    }
    last = kind
    writeQueue([...readQueue(), { kind, path, at: new Date().toISOString() }])
    listeners.forEach((listener) => listener())
    return kind
  })().finally(() => {
    checking = null
  })
  return checking
}

/** The host's refusal, read as such (`code: 'blocked'`): no need to ask. */
export function noteBlocked(path: string): void {
  last = 'blocked'
  writeQueue([...readQueue(), { kind: 'blocked', path, at: new Date().toISOString() }])
  listeners.forEach((listener) => listener())
}

/**
 * A request got through: whatever stopped the ones before is over, and what
 * happened to them goes to the backend's log (the only time it can).
 */
export function noteAnswered(): void {
  const notes = mayHoldNotes ? readQueue() : []
  if (notes.length === 0) mayHoldNotes = false
  if (last !== null) {
    last = null
    listeners.forEach((listener) => listener())
  }
  if (notes.length === 0) return
  writeQueue([])
  const blocked = notes.filter((note) => note.kind === 'blocked').length
  reportError(
    `Unanswered requests: ${blocked} blocked, ${notes.length - blocked} offline`,
    'network',
    notes.map((note) => `${note.at} ${note.kind} ${note.path}`).join('\n'),
  )
}

/** The last check's result while requests keep failing; null once one gets through. */
export function useUnanswered(): Unanswered | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => last,
  )
}

/** Forgets every check and note: each test starts clean (`test/setup.ts`). */
export function resetUnanswered(): void {
  last = null
  checking = null
  writeQueue([])
  // As a fresh page load: a note a test planted in storage is read.
  mayHoldNotes = true
}
