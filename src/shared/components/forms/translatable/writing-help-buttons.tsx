import { IconLanguage, IconSparkles } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui'
import { languageName } from '@/shared/constants/menu-languages'
import { useTranslateText, useWriteDescription } from '@/shared/hooks/use-writing-help'

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
  onTranslated: (language: string, text: string) => void
  onWritten: (text: string) => void
}

/**
 * The AI buttons under a translatable field (TranslatableTextField mounts it
 * only while the writing help is on): "Translate", the open tab's text into
 * the other language, or, while the open tab is empty, the other language's
 * text into it; and on a category's or the restaurant's description "Write
 * with AI", or "Improve" once the open tab has text. One at a time.
 */
export function WritingHelpButtons({
  active,
  text,
  peer,
  peerText,
  write,
  onTranslated,
  onWritten,
}: WritingHelpButtonsProps) {
  const { t } = useTranslation()
  const translation = useTranslateText()
  const writing = useWriteDescription()
  const busy = translation.isPending || writing.isPending
  // A category's line needs its name to start from.
  const unnamed = write?.kind === 'category' && write.subject === ''

  return (
    <div className="flex flex-wrap gap-1.5">
      {write ? (
        <Button
          variant="secondary"
          size="xs"
          loading={writing.isPending}
          disabled={busy || unnamed}
          title={unnamed ? t('writing.nameFirst') : undefined}
          leadingIcon={<IconSparkles size={14} aria-hidden />}
          onClick={() =>
            writing.mutate(
              write.kind === 'category'
                ? { kind: 'category', name: write.subject, text, language: active }
                : { kind: 'restaurant', text, language: active },
              { onSuccess: onWritten },
            )
          }
        >
          {text === '' ? t('writing.write') : t('writing.improve')}
        </Button>
      ) : null}
      {peer ? (
        <Button
          variant="secondary"
          size="xs"
          loading={translation.isPending}
          disabled={busy || (text === '' && peerText === '')}
          title={text === '' && peerText === '' ? t('writing.writeFirst') : undefined}
          leadingIcon={<IconLanguage size={14} aria-hidden />}
          onClick={() => {
            // From the open tab when it has text, else into it.
            const [from, to, source] = text === '' ? [peer, active, peerText] : [active, peer, text]
            translation.mutate(
              { text: source, from, to },
              { onSuccess: (translated) => onTranslated(to, translated) },
            )
          }}
        >
          {text === ''
            ? t('writing.translateFrom', { language: languageName(peer) })
            : t('writing.translateTo', { language: languageName(peer) })}
        </Button>
      ) : null}
    </div>
  )
}
