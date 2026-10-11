import { IconClock, IconLanguage, IconSparkles } from '@tabler/icons-react'
import { useEffect, useId, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui'
import { languageName } from '@/shared/constants/menu-languages'
import {
  useTranslateText,
  useWriteDescription,
  useWritingHelp,
} from '@/shared/hooks/use-writing-help'

/** What "Write with AI" writes: a category's line about `subject` (its name), or the restaurant's. */
export type DescriptionToWrite = { kind: 'category'; subject: string } | { kind: 'restaurant' }

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
 * The AI buttons under a translatable field (TranslatableTextField mounts it
 * only while the writing help is on): "Translate", the open tab's text into
 * the other language, or, while the open tab is empty, the other language's
 * text into it; and on a category's or the restaurant's description "Write
 * with AI", or "Improve" once the open tab has text. One at a time.
 *
 * Each carries the uses spent today out of the day's ("2/30", shared by
 * every button); once all are spent they turn red and cannot be pressed,
 * and the first such field on the screen says to come back tomorrow. No
 * count shows on a package with no daily cap.
 */
export function WritingHelpButtons({
  active,
  text,
  peer,
  peerText,
  write,
  maxLength,
  onTranslated,
  onWritten,
}: WritingHelpButtonsProps) {
  const { t } = useTranslation()
  const { uses, spentNoteBy, queueForSpentNote } = useWritingHelp()
  const field = useId()
  const translation = useTranslateText()
  const writing = useWriteDescription()
  const busy = translation.isPending || writing.isPending
  const spent = uses?.left === 0
  useEffect(() => (spent ? queueForSpentNote(field) : undefined), [spent, field, queueForSpentNote])
  // A category's line needs its name to start from.
  const unnamed = write?.kind === 'category' && write.subject === ''
  const nothingToTranslate = text === '' && peerText === ''

  // The day's count beside each label, and the reason a button is off.
  const used = uses && uses.limit !== null && uses.left !== null ? uses.limit - uses.left : null
  const count =
    used !== null ? (
      <span
        aria-hidden
        className="rounded-full bg-current/10 px-1.5 py-px text-[11px] font-semibold tabular-nums"
      >
        {used}/{uses?.limit}
      </span>
    ) : null
  const titleFor = (reason: string | null): string | undefined =>
    spent
      ? t('writing.spent')
      : (reason ??
        (used !== null ? t('writing.usesUsed', { used, limit: uses?.limit }) : undefined))

  const button = (props: {
    label: string
    icon: ReactNode
    loading: boolean
    blocked: string | null
    onClick: () => void
  }) => (
    <Button
      variant={spent ? 'spent' : 'secondary'}
      size="xs"
      loading={props.loading}
      disabled={spent || busy || props.blocked !== null}
      title={titleFor(props.blocked)}
      leadingIcon={props.icon}
      onClick={props.onClick}
    >
      {props.label}
      {count}
    </Button>
  )

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {write
        ? button({
            label: text === '' ? t('writing.write') : t('writing.improve'),
            icon: <IconSparkles size={14} aria-hidden />,
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
        : null}
      {peer
        ? button({
            label:
              text === ''
                ? t('writing.translateFrom', { language: languageName(peer) })
                : t('writing.translateTo', { language: languageName(peer) }),
            icon: <IconLanguage size={14} aria-hidden />,
            loading: translation.isPending,
            blocked: nothingToTranslate ? t('writing.writeFirst') : null,
            onClick: () => {
              // From the open tab when it has text, else into it.
              const [from, to, source] =
                text === '' ? [peer, active, peerText] : [active, peer, text]
              translation.mutate(
                { text: source, from, to, max: maxLength, fit: write?.kind },
                { onSuccess: (translated) => onTranslated(to, translated) },
              )
            },
          })
        : null}
      {spent && spentNoteBy === field ? (
        <p className="flex items-center gap-1 text-[12.5px] font-medium text-status-danger">
          <IconClock size={14} aria-hidden />
          {t('writing.spent')}
        </p>
      ) : null}
    </div>
  )
}
