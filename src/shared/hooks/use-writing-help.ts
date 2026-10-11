import { useMutation } from '@tanstack/react-query'
import { createContext, useContext } from 'react'
import { z } from 'zod'
import { request } from '@/lib/api'
import { t } from '@/lib/i18n'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'

const answerSchema = z.object({ data: z.object({ text: z.string() }) })

/** Set by `WritingHelpProvider`; off where there is none. */
export const WritingHelpContext = createContext(false)

export function useWritingHelpOn(): boolean {
  return useContext(WritingHelpContext)
}

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
 * Each answers with text for the form; nothing is saved until the owner
 * saves, so only a failure toasts (the server's words: a limit for today, or
 * try again).
 */
export function useTranslateText() {
  return useMutation<string, ApiError, TranslateInput>({
    mutationFn: async (input) => {
      const { data } = await request(answerSchema, {
        method: 'POST',
        url: '/api/writing/translate',
        data: input,
      })
      return data.text
    },
    onError: (error) => failed(t('writing.translateFailed'), error),
  })
}

export function useWriteDescription() {
  return useMutation<string, ApiError, DescribeInput>({
    mutationFn: async ({ kind, ...body }) => {
      const { data } = await request(answerSchema, {
        method: 'POST',
        url: `/api/writing/${kind}-description`,
        data: body,
      })
      return data.text
    },
    onError: (error) => failed(t('writing.writeFailed'), error),
  })
}

function failed(fallback: string, error: ApiError) {
  // The day's uses are spent: the server says when they are back, where the
  // usual rate-limit line would count the seconds until tomorrow.
  if (error.code === 'writing_help_limit') toast.error(error.message)
  else toast.error(fallback, error)
}
