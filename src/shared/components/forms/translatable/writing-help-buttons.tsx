import { IconClock, IconLanguage, IconSparkles } from '@tabler/icons-react'
import { useEffect, useId, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { languageName } from '@/shared/constants/menu-languages'
import {
  spentFor,
  useTranslateText,
  useWriteDescription,
  useWritingHelp,
  type WritingHelpAction,
} from '@/shared/hooks/use-writing-help'
import { formatDay } from '@/shared/utils/format/date'
import { formatNumber } from '@/shared/utils/format/number'

/**
 * What the AI buttons say of the allowance: why `action` is spent (come
 * back tomorrow, or on the day the month's credits come back), or the uses
 * spent today and the credits left this month. Null when there is nothing
 * to say.
 */
function useAllowanceWords() {
  const { t, i18n } = useTranslation()
  const { uses } = useWritingHelp()
  const locale = i18n.language as Locale

  return {
    spent: (action: WritingHelpAction): string | null => {
      const reason = spentFor(uses, action)
      if (reason === null) return null
      const credits = uses?.credits
      if (reason === 'day' || !credits) return t('writing.spent')
      const date = formatDay(credits.resets_on, locale)
      // Some left, too few for this: not "used", which reads as none.
      return credits.left
        ? t('writing.creditsShort', { date })
        : t('writing.creditsSpent', { date })
    },
    usage: (): string | null => {
      if (uses === null) return null
      const { credits } = uses
      const lines = [
        uses.limit !== null && uses.left !== null
          ? t('writing.usesUsed', { used: uses.limit - uses.left, limit: uses.limit })
          : null,
        credits?.limit != null && credits.left !== null
          ? t('writing.creditsLeft', {
              left: formatNumber(credits.left, locale),
              limit: formatNumber(credits.limit, locale),
            })
          : null,
      ].filter(Boolean)
      return lines.length > 0 ? lines.join('. ') : null
    },
  }
}

export type AiButtonProps = {
  label: string
  icon: ReactNode
  /** What it asks for: what it costs, and so when it is spent. */
  action: WritingHelpAction
  /** A small pill that says its label, rather than an icon alone. */
  pill?: boolean
  loading: boolean
  /** Another AI button of the same field is running: one at a time. */
  busy?: boolean
  /** Why it cannot be pressed now, as its tooltip; null when it can. */
  blocked: string | null
  onClick: () => void
}

/**
 * One AI button, everywhere one is: gold (red and locked once the day's uses
 * are spent or the month's credits do not cover its `action`), an icon as
 * tall as the language tabs or, with `pill`, a round pill that says its
 * label. Its tooltip says what it does, then why it is off, or the uses
 * spent today and the credits left this month.
 */
export function AiButton({
  label,
  icon,
  pill,
  action,
  loading,
  busy,
  blocked,
  onClick,
}: AiButtonProps) {
  const words = useAllowanceWords()
  const spentWords = words.spent(action)
  const spent = spentWords !== null
  const title = [label, spentWords ?? blocked ?? words.usage()].filter(Boolean).join('. ')

  return (
    <Button
      variant={spent ? 'spent' : 'accent'}
      size={pill ? 'xs' : 'icon-sm'}
      className={pill ? 'rounded-full' : undefined}
      loading={loading}
      disabled={spent || busy || blocked !== null}
      aria-label={pill ? undefined : label}
      title={title}
      leadingIcon={icon}
      onClick={onClick}
    >
      {pill ? label : null}
    </Button>
  )
}

/** What "Write with AI" writes: a category's line about `subject` (its name), or the restaurant's. */
type DescriptionToWrite = { kind: 'category'; subject: string } | { kind: 'restaurant' }

export type WritingHelpButtonsProps = {
  /** The open tab. */
  active: string
  /** The open tab's text, trimmed. */
  text: string
  /** The menu's other language than the open tab's; none means nothing to translate. */
  peer: string | undefined
  /** Its text, trimmed. */
  peerText: string
  /** Null when this field is not a description. */
  write: DescriptionToWrite | null
  /** The field's limit: a translation never runs past it. */
  maxLength: number
  onTranslated: (language: string, text: string) => void
  onWritten: (text: string) => void
}

/**
 * The AI buttons of a translatable field (TranslatableTextField places them
 * only while the writing help is on), small icons so they take no line of
 * their own: `translate`, beside the language tabs, puts the open tab's
 * text into the other language, or, while the open tab is empty, the other
 * language's text into it; `write`, inside a category's or the
 * restaurant's description box, a small labelled pill, writes it with AI, or improves it once the
 * open tab has text. One at a time.
 *
 * Each button's tooltip says what it does, the uses spent today out of the
 * day's and the credits left this month; once either does not cover it, it
 * turns red and cannot be pressed (WritingHelpSpentNote says when to come
 * back).
 */
export function WritingHelpButtons({
  children,
  ...props
}: WritingHelpButtonsProps & {
  /** Places the two buttons where they go in the field. */
  children: (buttons: { translate: ReactNode; write: ReactNode }) => ReactNode
}) {
  return children(useWritingHelpButtons(props))
}

function useWritingHelpButtons({
  active,
  text,
  peer,
  peerText,
  write,
  maxLength,
  onTranslated,
  onWritten,
}: WritingHelpButtonsProps): { translate: ReactNode; write: ReactNode } {
  const { t } = useTranslation()
  const translation = useTranslateText()
  const writing = useWriteDescription()
  const busy = translation.isPending || writing.isPending
  // A category's line needs its name to start from.
  const unnamed = write?.kind === 'category' && write.subject === ''
  const nothingToTranslate = text === '' && peerText === ''

  const button = (props: Omit<AiButtonProps, 'busy'>) => <AiButton busy={busy} {...props} />

  return {
    write: write
      ? button({
          label: text === '' ? t('writing.write') : t('writing.improve'),
          icon: <IconSparkles size={14} aria-hidden />,
          pill: true,
          action: 'description',
          loading: writing.isPending,
          blocked: unnamed ? t('writing.nameFirst') : null,
          onClick: () =>
            writing.mutate(
              write.kind === 'category'
                ? { kind: 'category', name: write.subject, text, language: active }
                : { kind: 'restaurant', text, language: active },
              { onSuccess: (written) => onWritten(written) },
            ),
        })
      : null,
    translate: peer
      ? button({
          label:
            text === ''
              ? t('writing.translateFrom', { language: languageName(peer) })
              : t('writing.translateTo', { language: languageName(peer) }),
          icon: <IconLanguage size={16} aria-hidden />,
          action: 'translation',
          loading: translation.isPending,
          blocked: nothingToTranslate ? t('writing.writeFirst') : null,
          onClick: () => {
            // From the open tab when it has text, else into it.
            const [from, to, source] = text === '' ? [peer, active, peerText] : [active, peer, text]
            translation.mutate(
              { text: source, from, to, max: maxLength, fit: write?.kind },
              { onSuccess: (translated) => onTranslated(to, translated) },
            )
          },
        })
      : null,
  }
}

/**
 * When the AI comes back, once a button the field shows is spent (the day's
 * uses, or the month's credits short of what it costs), said in words for
 * a phone, which shows no tooltip: once on a screen, by the first field
 * that shows this, not under every field.
 */
export function WritingHelpSpentNote({ actions }: { actions: readonly WritingHelpAction[] }) {
  const { spentNoteBy, queueForSpentNote } = useWritingHelp()
  const field = useId()
  const allowance = useAllowanceWords()
  const words = actions.map((action) => allowance.spent(action)).find(Boolean) ?? null
  const spent = words !== null
  useEffect(() => (spent ? queueForSpentNote(field) : undefined), [spent, field, queueForSpentNote])

  return spent && spentNoteBy === field ? (
    <p className="flex items-center gap-1 text-[12.5px] font-medium text-status-danger">
      <IconClock size={14} aria-hidden />
      {words}
    </p>
  ) : null
}
