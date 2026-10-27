import { useIsMutating, useMutation } from '@tanstack/react-query'
import { createContext, useContext } from 'react'
import { z } from 'zod'
import { request } from '@/lib/api'
import { t } from '@/lib/i18n'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'
import { todayDay } from '@/shared/utils/format/date'

/** What the owner asks the AI for, each at its own price in credits. */
export type WritingHelpAction = 'translation' | 'description'

/**
 * The month's AI credits: how many and those left (null for no cap), the
 * day they come back ("YYYY-MM-DD") and each action's price. Never money.
 */
export type WritingHelpCredits = {
  limit: number | null
  left: number | null
  resets_on: string
  prices: Record<WritingHelpAction, number>
}

/**
 * What the writing help allows: the month's credits, its only limit (null
 * from a server from before them).
 */
export type WritingHelpUses = {
  credits: WritingHelpCredits | null
}

/** What an answer or a refusal says is left of the month's credits. */
export type WritingHelpLeft = { credits?: number | null }

/** `uses` with what an answer or a refusal says is left; a count it does not give is kept. */
export function withLeft<T extends WritingHelpUses>(uses: T, left: WritingHelpLeft): T {
  return uses.credits && left.credits !== undefined
    ? { ...uses, credits: { ...uses.credits, left: left.credits } }
    : uses
}

/**
 * Whether the month's credits are short of what `action` costs. Once their
 * day comes (a tab left open from the month before), they are taken as back:
 * the server, which has them again, has the last word.
 */
function monthShort(credits: WritingHelpCredits | null, action: WritingHelpAction): boolean {
  return (
    credits?.left != null && credits.left < credits.prices[action] && todayDay() < credits.resets_on
  )
}

/**
 * Why `action` cannot run now: the month's credits do not cover it; null
 * when it can. The server refuses the same.
 */
export function spentFor(uses: WritingHelpUses | null, action: WritingHelpAction): 'month' | null {
  return uses !== null && monthShort(uses.credits, action) ? 'month' : null
}

type WritingHelpState = {
  /** Null while the restaurant has no writing help: no buttons. */
  uses: WritingHelpUses | null
  /** What is left now, after a use or a refusal. */
  setLeft: (left: WritingHelpLeft) => void
  /**
   * "They come back on …" is said once on a screen, not under every field:
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

const left = {
  // Missing from a server from before the credits: the count is kept.
  credits_left: z.number().int().nullable().optional(),
}

const answerSchema = z.object({ data: z.object({ text: z.string(), ...left }) })

const listAnswerSchema = z.object({ data: z.object({ texts: z.array(z.string()), ...left }) })

/** A piece of text, the way it goes, and the limit of the field it goes into (kept to). */
export type TranslationPiece = { text: string; from: string; to: string; max?: number }

type TranslateInput = TranslationPiece & {
  /** The description it is: one the AI wrote keeps that length in the other language. */
  fit?: 'category' | 'restaurant'
}

/** `text` is the owner's own description to improve; empty writes a new one. */
type DescribeInput =
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
 * Each answers with text for the form and the credits left this month,
 * which every AI button shows; nothing is saved until the owner saves, so
 * only a failure toasts (the server's words: no credits left, busy, or try
 * again).
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
      setLeft({ credits: data.credits_left })
      return data.text
    },
    onError: (error) => failed(t('writing.translateFailed'), error, setLeft),
  })
}

const TRANSLATE_MANY = ['writing-help', 'translate-many'] as const

/**
 * Whether a list is being translated anywhere on the screen: a dish's save
 * and its "Translate all names" wait for each other, since the server runs
 * one AI request a restaurant at a time and would answer the second "busy".
 */
export function useTranslatingMany(): boolean {
  return useIsMutating({ mutationKey: TRANSLATE_MANY }) > 0
}

/**
 * Many pieces in one go (`POST /api/writing/translate-many`): every text a
 * dish's or a category's save leaves in one language (useTranslateOnSave),
 * or the variants' and add-ons' "Translate all names". One translation's
 * credits for the lot; the answers come back in the order sent.
 */
export function useTranslateMany() {
  const { setLeft } = useWritingHelp()

  return useMutation<string[], ApiError, TranslationPiece[]>({
    mutationKey: TRANSLATE_MANY,
    mutationFn: async (items) => {
      const { data } = await request(listAnswerSchema, {
        method: 'POST',
        url: '/api/writing/translate-many',
        data: { items },
      })
      setLeft({ credits: data.credits_left })
      return data.texts
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
      setLeft({ credits: data.credits_left })
      return data.text
    },
    onError: (error) => failed(t('writing.writeFailed'), error, setLeft),
  })
}

function failed(fallback: string, error: ApiError, setLeft: (left: WritingHelpLeft) => void) {
  // The month's credits do not cover this (another tab may have used the
  // last): the buttons lock, and the server's words say when they are back,
  // where the usual rate-limit line would count the seconds until then.
  if (error.code === 'writing_help_credits') {
    setLeft({ credits: error.creditsLeft ?? 0 })
    toast.error(error.message)
  } else {
    toast.error(fallback, error)
  }
}
