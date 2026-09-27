import { ChartNoAxesColumn, Languages, type LucideIcon, QrCode, ReceiptText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { NavAccess } from '@/app/layouts/authenticated/nav-items'
import { Field, FormSection } from '@/shared/components/forms'
import { Combobox, Segmented, Switch } from '@/shared/components/ui'
import { MAIN_LANGUAGE, MENU_LANGUAGES, languageName } from '@/shared/constants/menu-languages'
import { useSaveMenuLanguages } from '../hooks/use-menu-languages-save'
import { useSaveHiddenSections } from '../hooks/use-sections'

type FeatureKey = 'orders' | 'qr' | 'analytics' | 'languages'

export type FeaturesPageProps = {
  /** Features the owner switched off. */
  hidden: readonly string[]
  /** What the package includes, to mark a feature it does not. */
  features: NavAccess['features']
  /** The second language chosen, kept even while languages are off. */
  secondLocale: string | null
  /** What the menu opens in. */
  defaultLocale: string
}

const ROWS: { key: FeatureKey; icon: LucideIcon; plan?: keyof NavAccess['features'] }[] = [
  { key: 'orders', icon: ReceiptText, plan: 'ordering' },
  { key: 'qr', icon: QrCode, plan: 'qr_studio' },
  { key: 'analytics', icon: ChartNoAxesColumn },
  { key: 'languages', icon: Languages },
]

/**
 * One switch per optional feature, in the order owners think about them.
 * Nothing is deleted by switching one off; see `Restaurant::OPTIONAL_FEATURES`
 * in ../qayema for what each one does. "Multiple languages" carries its own
 * settings: which second language, and which one the menu opens in.
 */
export function FeaturesPage({ hidden, features, secondLocale, defaultLocale }: FeaturesPageProps) {
  const { t } = useTranslation('settings')
  const save = useSaveHiddenSections()

  const toggle = (key: FeatureKey, on: boolean) => {
    save.mutate(on ? hidden.filter((feature) => feature !== key) : [...hidden, key])
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h2 className="font-display text-[19px] leading-tight">{t('features.title')}</h2>
        <p className="mt-1 text-[13px] leading-snug text-[var(--muted)]">
          {t('features.description')}
        </p>
      </div>

      <FormSection title={t('features.listTitle')}>
        <ul className="flex flex-col divide-y-[0.5px] divide-[var(--line-2)]">
          {ROWS.map(({ key, icon: Icon, plan }) => {
            const on = !hidden.includes(key)
            const label = t(`features.${key}.label`)
            const offNote = key === 'analytics' ? null : t(`features.${key}.offNote`)

            return (
              <li key={key} className="flex items-start gap-3 py-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[var(--hover-wash)] text-[var(--muted)]">
                  <Icon aria-hidden className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium">
                    {label}
                    {plan && !features[plan] ? (
                      <span className="ms-2 text-[12px] font-normal text-[var(--faint)]">
                        {t('features.notOnPackage')}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[12.5px] leading-snug text-[var(--muted)]">
                    {t(`features.${key}.description`)}
                  </p>
                  {!on && offNote ? (
                    <p className="mt-1 text-[12.5px] leading-snug text-[var(--status-warn)]">
                      {offNote}
                    </p>
                  ) : null}
                  {key === 'languages' && on ? (
                    <LanguageChoice secondLocale={secondLocale} defaultLocale={defaultLocale} />
                  ) : null}
                </div>
                <Switch
                  checked={on}
                  onChange={(next) => toggle(key, next)}
                  aria-label={t('features.toggle', { feature: label })}
                  className="mt-1.5"
                />
              </li>
            )
          })}
        </ul>
      </FormSection>
    </div>
  )
}

/** Which second language, and which of the two the menu opens in. Saves on change. */
function LanguageChoice({
  secondLocale,
  defaultLocale,
}: {
  secondLocale: string | null
  defaultLocale: string
}) {
  const { t } = useTranslation('settings')
  const save = useSaveMenuLanguages()

  const options = Object.keys(MENU_LANGUAGES)
    .filter((code) => code !== MAIN_LANGUAGE)
    .map((code) => ({ value: code, label: describe(code) }))

  const opening = secondLocale && defaultLocale === secondLocale ? secondLocale : MAIN_LANGUAGE

  return (
    <div className="mt-3 grid gap-4 rounded-[12px] border-[0.5px] border-[var(--line)] bg-[var(--bg)] p-3.5 sm:grid-cols-2">
      <Field
        label={t('features.languages.secondLabel')}
        hint={t('features.languages.secondHint')}
        className="pt-0"
      >
        {({ id, describedBy }) => (
          <Combobox
            id={id}
            aria-describedby={describedBy}
            options={options}
            value={secondLocale}
            placeholder={t('features.languages.secondPlaceholder')}
            emptyText={t('features.languages.searchEmpty')}
            disabled={save.isPending}
            onChange={(next) => {
              if (!next || next === secondLocale) return
              // A new second language keeps the menu opening in English unless
              // it already opened in the old second one.
              save.mutate({
                second_locale: next,
                default_locale: opening === MAIN_LANGUAGE ? MAIN_LANGUAGE : next,
              })
            }}
          />
        )}
      </Field>

      {secondLocale ? (
        <Field label={t('features.languages.openingLabel')} className="pt-0">
          {() => (
            <Segmented
              aria-label={t('features.languages.openingLabel')}
              value={opening}
              onChange={(next) =>
                save.mutate({ second_locale: secondLocale, default_locale: next })
              }
              options={[MAIN_LANGUAGE, secondLocale].map((code) => ({
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

/** "French · Français"; one name when both are the same word. */
function describe(code: string): string {
  const name = languageName(code)
  const native = MENU_LANGUAGES[code]?.name
  return !native || native === name ? name : `${name} · ${native}`
}
