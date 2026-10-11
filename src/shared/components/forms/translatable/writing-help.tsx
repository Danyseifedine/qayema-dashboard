import type { ReactNode } from 'react'
import { WritingHelpContext } from '@/shared/hooks/use-writing-help'

/**
 * Whether the AI buttons show (`restaurant.writing_help` from the session).
 * Provided once around the signed-in app, so every translatable field
 * follows it (`useWritingHelpOn`) without each form passing it down.
 */
export function WritingHelpProvider({ on, children }: { on: boolean; children: ReactNode }) {
  return <WritingHelpContext.Provider value={on}>{children}</WritingHelpContext.Provider>
}
