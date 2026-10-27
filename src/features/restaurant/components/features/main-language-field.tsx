import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '@/shared/components/feedback'
import { Field } from '@/shared/components/forms'
import { Alert, Button, Combobox } from '@/shared/components/ui'
import { MENU_LANGUAGES, languageName } from '@/shared/constants/menu-languages'
import {
  useMenuLanguagesState,
  useSaveMenuLanguages,
} from '@/features/restaurant/hooks/use-menu-languages-save'
import { describeLanguage } from '@/features/restaurant/utils/describe-language'

/** The menu's languages as `PUT /api/menu-languages` takes them. */
type Languages = { main_locale: string; second_locale: string | null; default_locale: string }

/**
 * The languages with a new main one, as `MenuLanguages::withMain()` in
 * ../qayema: the second language chosen as main swaps with the old main (both
 * texts already exist), another keeps the second; the menu keeps opening in
 * the main language if it did. A package without multiple languages saves
 * none (the server refuses one): the main language alone, whatever is
 * written in the other one kept for a package that has it.
 */
function withMain(current: Languages, main: string, canHaveSecond: boolean): Languages {
  if (!canHaveSecond) return { main_locale: main, second_locale: null, default_locale: main }
  const oldMain = current.main_locale
  const second = current.second_locale === main ? oldMain : current.second_locale
  const opening =
    current.default_locale === oldMain || ![main, second].includes(current.default_locale)
      ? main
      : current.default_locale
  return { main_locale: main, second_locale: second, default_locale: opening }
}

type MainLanguageFieldProps = {
  mainLocale: string
  secondLocale: string | null
  defaultLocale: string
  /** The package has multiple languages, so a second one is kept. */
  canHaveSecond: boolean
  onOpenDishes: () => void
}

/**
 * The language the menu is written in: every name is required in it, and it
 * is the only one shown while "Multiple languages" is off or not on the
 * package. Any package picks it. Making the second language the main one is
 * a swap and saves at once; a brand-new one asks first, since what is
 * written keeps its old language until it is written again, and says how
 * much is left to write.
 */
export function MainLanguageField({
  mainLocale,
  secondLocale,
  defaultLocale,
  canHaveSecond,
  onOpenDishes,
}: MainLanguageFieldProps) {
  const { t } = useTranslation('features')
  const save = useSaveMenuLanguages()
  const state = useMenuLanguagesState()
  const [pending, setPending] = useState<string | null>(null)
  const current = {
    main_locale: mainLocale,
    second_locale: secondLocale,
    default_locale: defaultLocale,
  }

  const options = Object.keys(MENU_LANGUAGES).map((code) => ({
    value: code,
    label: describeLanguage(code),
  }))
  const missing = state.data?.missing
  const left = (missing?.categories ?? 0) + (missing?.dishes ?? 0)

  const choose = (next: string | null) => {
    if (!next || next === mainLocale) return
    if (next === secondLocale) {
      save.mutate(withMain(current, next, canHaveSecond))
      return
    }
    setPending(next)
  }

  return (
    <>
      <Field label={t('mainLanguage.label')} hint={t('mainLanguage.hint')} className="pt-0">
        {({ id, describedBy }) => (
          <Combobox
            id={id}
            aria-describedby={describedBy}
            options={options}
            value={mainLocale}
            placeholder={t('mainLanguage.placeholder')}
            emptyText={t('languages.searchEmpty')}
            disabled={save.isPending}
            onChange={choose}
          />
        )}
      </Field>

      {missing && left > 0 ? (
        <Alert variant="warning">
          <span>
            {t('mainLanguage.missing', {
              categories: t('mainLanguage.categories', { count: missing.categories }),
              dishes: t('mainLanguage.dishes', { count: missing.dishes }),
              language: languageName(mainLocale),
            })}
          </span>{' '}
          <Button
            variant="link"
            size="sm"
            onClick={onOpenDishes}
            className="h-auto px-0 align-baseline font-medium"
          >
            {t('mainLanguage.openDishes')}
          </Button>
        </Alert>
      ) : null}

      <ConfirmDialog
        open={pending !== null}
        title={t('mainLanguage.confirmTitle', { language: languageName(pending ?? mainLocale) })}
        description={t('mainLanguage.confirmBody', {
          language: languageName(pending ?? mainLocale),
          current: languageName(mainLocale),
        })}
        confirmLabel={t('mainLanguage.confirm', { language: languageName(pending ?? mainLocale) })}
        loading={save.isPending}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending === null) return
          save.mutate(withMain(current, pending, canHaveSecond), {
            onSettled: () => setPending(null),
          })
        }}
      />
    </>
  )
}
