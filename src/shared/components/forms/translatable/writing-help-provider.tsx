import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  WritingHelpContext,
  type WritingHelpLeft,
  type WritingHelpUses,
} from '@/shared/hooks/use-writing-help'

/**
 * The writing help's state for every AI button (`restaurant.writing_help`
 * from the session): null for no buttons, else the uses a day and those
 * left, and the month's credits. Provided once around the signed-in app, so every translatable field
 * follows it (`useWritingHelp`) without each form passing it down;
 * `onLeft` keeps the session's counts in step after each use. It also keeps
 * the queue for the one "come back tomorrow" note a screen shows.
 */
export function WritingHelpProvider({
  uses,
  onLeft,
  children,
}: {
  uses: WritingHelpUses | null
  onLeft: (left: WritingHelpLeft) => void
  children: ReactNode
}) {
  const [queue, setQueue] = useState<string[]>([])
  const queueForSpentNote = useCallback((field: string) => {
    setQueue((now) => [...now, field])
    return () => setQueue((now) => now.filter((queued) => queued !== field))
  }, [])

  // One value per change, so the fields under it redraw only when it moves.
  const value = useMemo(
    () => ({ uses, setLeft: onLeft, spentNoteBy: queue[0] ?? null, queueForSpentNote }),
    [uses, onLeft, queue, queueForSpentNote],
  )

  return <WritingHelpContext.Provider value={value}>{children}</WritingHelpContext.Provider>
}
