import { useEffect } from 'react'
import { useWatch, type Control, type UseFormSetValue } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ChoiceField, ComboboxField, FormSection } from '@/shared/components/forms'
import { Alert } from '@/shared/components/ui'
import { MAIN_LANGUAGE, MENU_LANGUAGES, languageName } from '@/shared/constants/menu-languages'
import {
  NO_SECOND_LANGUAGE,
  formLanguages,
  type SettingsFormValues,
} from '../../schemas/settings.schema'

/** "French · Français"; English needs no second name. */
function describe(code: string): string {
  const name = languageName(code)
  const native = MENU_LANGUAGES[code]?.name
  // In the language's own interface its two names are the same word.
  return code === MAIN_LANGUAGE || !native || native === name ? name : `${name} · ${native}`
}

/** Every language but English, the codes fixed and the names read at render. */
const SECOND_LANGUAGE_CODES = Object.keys(MENU_LANGUAGES).filter((code) => code !== MAIN_LANGUAGE)

export type MenuLanguagesSectionProps = {
  control: Control<SettingsFormValues>
  setValue: UseFormSetValue<SettingsFormValues>
  /** The second language as saved, to explain what a change does to its text. */
  savedSecond: string | null
}

/**
 * What the menu is written in. English always; one more language, if the
 * owner wants it; and which of the two the menu opens in.
 */
export function MenuLanguagesSection({
  control,
  setValue,
  savedSecond,
}: MenuLanguagesSectionProps) {
  const { t } = useTranslation('settings')
  const second = useWatch({ control, name: 'second_locale' })
  const opening = useWatch({ control, name: 'default_locale' })
  const languages = formLanguages(second)

  // Dropping or changing the second language cannot leave the menu opening in
  // a language it is no longer written in.
  useEffect(() => {
    if (!languages.includes(opening)) {
      setValue('default_locale', MAIN_LANGUAGE, { shouldDirty: true, shouldValidate: true })
    }
  }, [languages, opening, setValue])

  const changing = savedSecond !== null && second !== savedSecond

  const secondOptions = [
    { value: NO_SECOND_LANGUAGE, label: t('menuLanguages.noSecond') },
    ...SECOND_LANGUAGE_CODES.map((code) => ({ value: code, label: describe(code) })),
  ]

  return (
    <FormSection title={t('menuLanguages.title')} description={t('menuLanguages.description')}>
      <ComboboxField
        control={control}
        name="second_locale"
        label={t('menuLanguages.secondLabel')}
        options={secondOptions}
        placeholder={t('menuLanguages.searchPlaceholder')}
        emptyText={t('menuLanguages.empty')}
        hint={t('menuLanguages.secondHint')}
      />

      {changing ? (
        <Alert variant="info">
          {t('menuLanguages.keptNotice', { language: languageName(savedSecond) })}
        </Alert>
      ) : null}

      {languages.length > 1 ? (
        <ChoiceField
          control={control}
          name="default_locale"
          label={t('menuLanguages.openingLabel')}
          options={languages.map((code) => ({ value: code, label: describe(code) }))}
          hint={t('menuLanguages.openingHint')}
        />
      ) : (
        <p className="text-[12.5px] text-[var(--muted)]">{t('menuLanguages.englishOnly')}</p>
      )}
    </FormSection>
  )
}
