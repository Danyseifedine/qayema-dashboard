import { useMutation } from '@tanstack/react-query'
import { createContext, useContext } from 'react'
import { z } from 'zod'
import { request } from '@/lib/api'
import { t } from '@/lib/i18n'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'

/** The uses a day and those left; null for no daily cap. */
export type WritingHelpUses = { limit: number | null; left: number | null }

export type WritingHelpState = {
  /** Null while the restaurant has no writing help: no buttons. */
  uses: WritingHelpUses | null
  /** What is left now, after a use or a refusal. */
  setLeft: (left: number | null) => void
  /**
   * "Come back tomorrow" is said once on a screen, not under every field:
   * fields whose buttons are spent queue for it, and the first one says it.
   */
  spentNoteBy: string | null
  /** Queues a field for the note; returns the way out of the queue. */
  queueForSpentNote: (field: string) => () => void
}

/** Set by `WritingHelpProvider`; off where there is none. */
export const WritingHelpContext = createContext<WritingHelpState>({
  uses: null,
  setLeft: () => {},
  spentNoteBy: null,
  queueForSpentNote: () => () => {},
})

export function useWritingHelp(): WritingHelpState {
  return useContext(WritingHelpContext)
}

const answerSchema = z.object({
  data: z.object({ text: z.string(), left: z.number().int().nullable() }),
})

export type TranslateInput = { text: string; from: string; to: string }

/** `text` is the owner's own description to improve; empty writes a new one. */
export type DescribeInput =
  | {
      kind: 'category'
      /** The category's name, in the language written in when it has one there. */
      name: string
      text: string
      language: string
    }
  /** The server reads the restaurant's name and menu itself. */
  | { kind: 'restaurant'; text: string; language: string }

/**
 * The writing help (`POST /api/writing/*`, see ../qayema WritingHelpController).
 * Each answers with text for the form and the uses left today, which every
 * AI button shows; nothing is saved until the owner saves, so only a failure
 * toasts (the server's words: none left today, busy, or try again).
 */
export function useTranslateText() {
  const { setLeft } = useWritingHelp()

  return useMutation<string, ApiError, TranslateInput>({
    mutationFn: async (input) => {
      const { data } = await request(answerSchema, {
        method: 'POST',
        url: '/api/writing/translate',
        data: input,
      })
      setLeft(data.left)
      return data.text
    },
    onError: (error) => failed(t('writing.translateFailed'), error, setLeft),
  })
}

export function useWriteDescription() {
  const { setLeft } = useWritingHelp()

  return useMutation<string, ApiError, DescribeInput>({
    mutationFn: async ({ kind, ...body }) => {
      const { data } = await request(answerSchema, {
        method: 'POST',
        url: `/api/writing/${kind}-description`,
        data: body,
      })
      setLeft(data.left)
      return data.text
    },
    onError: (error) => failed(t('writing.writeFailed'), error, setLeft),
  })
}

function failed(fallback: string, error: ApiError, setLeft: (left: number) => void) {
  // The day's uses are spent (another tab may have used the last): the
  // buttons lock, and the server's words say when they are back, where the
  // usual rate-limit line would count the seconds until tomorrow.
  if (error.code === 'writing_help_limit') {
    setLeft(0)
    toast.error(error.message)
  } else {
    toast.error(fallback, error)
  }
}
