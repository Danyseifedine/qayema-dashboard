import { useTranslation } from 'react-i18next'
import { Field } from '@/shared/components/forms'
import { Combobox, Segmented } from '@/shared/components/ui'
import { MENU_LANGUAGES, languageName } from '@/shared/constants/menu-languages'
import { useSaveMenuLanguages } from '@/features/restaurant/hooks/use-menu-languages-save'
import { describeLanguage } from '@/features/restaurant/utils/describe-language'

type LanguageChoiceProps = {
  mainLocale: string
  secondLocale: string | null
  defaultLocale: string
}

/** Which second language, and which of the two the menu opens in. Saves on change. */
export function LanguageChoice({ mainLocale, secondLocale, defaultLocale }: LanguageChoiceProps) {
  const { t } = useTranslation('features')
  const save = useSaveMenuLanguages()

  const options = Object.keys(MENU_LANGUAGES)
    .filter((code) => code !== mainLocale)
    .map((code) => ({ value: code, label: describeLanguage(code) }))

  const opening = secondLocale && defaultLocale === secondLocale ? secondLocale : mainLocale

  return (
    <div className="mt-2.5 grid gap-3 inset-tile p-3 sm:grid-cols-2">
      <Field label={t('languages.secondLabel')} hint={t('languages.secondHint')} className="pt-0">
        {({ id, describedBy }) => (
          <Combobox
            id={id}
            aria-describedby={describedBy}
            options={options}
            value={secondLocale}
            placeholder={t('languages.secondPlaceholder')}
            emptyText={t('languages.searchEmpty')}
            disabled={save.isPending}
            onChange={(next) => {
              if (!next || next === secondLocale) return
              // A new second language keeps the menu opening in the main one
              // unless it already opened in the old second one.
              save.mutate({
                main_locale: mainLocale,
                second_locale: next,
                default_locale: opening === mainLocale ? mainLocale : next,
              })
            }}
          />
        )}
      </Field>

      {secondLocale ? (
        <Field label={t('languages.openingLabel')} className="pt-0">
          {() => (
            <Segmented
              aria-label={t('languages.openingLabel')}
              value={opening}
              onChange={(next) =>
                save.mutate({
                  main_locale: mainLocale,
                  second_locale: secondLocale,
                  default_locale: next,
                })
              }
              options={[mainLocale, secondLocale].map((code) => ({
                value: code,
                label: languageName(code),
                disabled: save.isPending,
              }))}
            />
          )}
        </Field>
      ) : null}
    </div>
  )
}
