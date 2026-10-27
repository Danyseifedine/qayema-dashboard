import { useTranslation } from 'react-i18next'
import { Alert } from '@/shared/components/ui'
import { languageName } from '@/shared/constants/menu-languages'

/**
 * Atop a menu form that translates on save (useTranslateOnSave): one of the
 * menu's two languages is enough, the AI fills in the other.
 */
export function OneLanguageNote({ languages }: { languages: readonly string[] }) {
  const { t } = useTranslation()

  return (
    <Alert variant="info" className="mt-3">
      {t('writing.oneLanguage', {
        first: languageName(languages[0]!),
        second: languageName(languages[1]!),
      })}
    </Alert>
  )
}
