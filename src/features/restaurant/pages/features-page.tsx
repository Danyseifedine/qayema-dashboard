import {
  ChartNoAxesColumn,
  CirclePlus,
  Languages,
  ListChecks,
  Lock,
  type LucideIcon,
  QrCode,
  ReceiptText,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Plan } from '@/features/auth'
import { usePackageFor, type PackageFlag } from '@/features/package'
import { Field, FormSection } from '@/shared/components/forms'
import { Combobox, Segmented, Switch } from '@/shared/components/ui'
import { MAIN_LANGUAGE, MENU_LANGUAGES, languageName } from '@/shared/constants/menu-languages'
import { useSaveMenuLanguages } from '@/features/restaurant/hooks/use-menu-languages-save'
import { useSaveSwitchedOff } from '@/features/restaurant/hooks/use-features'
import { usePreferencesStore } from '@/stores/preferences.store'
import { cn } from '@/shared/utils/dom/cn'

type FeatureKey = 'orders' | 'variants' | 'addons' | 'qr' | 'analytics' | 'languages'

export type FeaturesPageProps = {
  /** Features the owner switched off. */
  off: readonly string[]
  /** What the package includes, to mark a feature it does not. */
  plan: Plan
  /** The second language chosen, kept even while languages are off. */
  secondLocale: string | null
  /** What the menu opens in. */
  defaultLocale: string
  /** Opens the Package page, from a feature the package does not include. */
  onOpenPackage: () => void
}

const ROWS: { key: FeatureKey; icon: LucideIcon; plan: PackageFlag }[] = [
  { key: 'orders', icon: ReceiptText, plan: 'ordering' },
  { key: 'variants', icon: ListChecks, plan: 'variants' },
  { key: 'addons', icon: CirclePlus, plan: 'addons' },
  { key: 'qr', icon: QrCode, plan: 'qr_studio' },
  { key: 'analytics', icon: ChartNoAxesColumn, plan: 'analytics' },
  { key: 'languages', icon: Languages, plan: 'multiple_languages' },
]

/**
 * One switch per optional feature, in the order owners think about them.
 * Nothing is deleted by switching one off; see `Restaurant::OPTIONAL_FEATURES`
 * in ../qayema for what each one does. "Multiple languages" carries its own
 * settings: which second language, and which one the menu opens in.
 */
export function FeaturesPage({
  off,
  plan,
  secondLocale,
  defaultLocale,
  onOpenPackage,
}: FeaturesPageProps) {
  const { t } = useTranslation('features')
  const save = useSaveSwitchedOff()

  const toggle = (key: FeatureKey, on: boolean) => {
    save.mutate(on ? off.filter((feature) => feature !== key) : [...off, key])
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h2 className="font-display text-[19px] leading-tight">{t('title')}</h2>
        <p className="mt-1 text-[13px] leading-snug text-[var(--muted)]">{t('description')}</p>
      </div>

      <FormSection title={t('listTitle')}>
        <ul className="flex flex-col divide-y-[0.5px] divide-[var(--line-2)]">
          {ROWS.map((row) => {
            const { key, icon: Icon } = row
            // Without the package a feature is off whatever the owner chose;
            // their choice is kept and applies again once the package has it.
            const included = plan[row.plan]
            const on = included && !off.includes(key)
            const label = t(`${key}.label`)
            const offNote = key === 'analytics' ? null : t(`${key}.offNote`)

            return (
              <li key={key} className="flex items-start gap-3 py-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[var(--hover-wash)] text-[var(--muted)]">
                  <Icon aria-hidden className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium">
                    {label}
                    {included ? null : (
                      <PackageChip flag={row.plan} onOpenPackage={onOpenPackage} />
                    )}
                  </p>
                  <p className="text-[12.5px] leading-snug text-[var(--muted)]">
                    {t(`${key}.description`)}
                  </p>
                  {included && !on && offNote ? (
                    <p className="mt-1 text-[12.5px] leading-snug text-[var(--status-warn)]">
                      {offNote}
                    </p>
                  ) : null}
                  {/* The pickers need the package: the server refuses a second
                      language without it. */}
                  {key === 'languages' && on ? (
                    <LanguageChoice secondLocale={secondLocale} defaultLocale={defaultLocale} />
                  ) : null}
                </div>
                <Switch
                  checked={on}
                  disabled={!included}
                  onChange={(next) => toggle(key, next)}
                  aria-label={t('toggle', { feature: label })}
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

/**
 * Where a feature the package lacks can be had, as the sidebar's lock chip:
 * the first package that includes it ("Premium"), which opens the Package
 * page. Until the packages load it says the owner's package lacks it.
 */
function PackageChip({ flag, onOpenPackage }: { flag: PackageFlag; onOpenPackage: () => void }) {
  const { t } = useTranslation('features')
  const locale = usePreferencesStore((state) => state.locale)
  const name = usePackageFor(flag, locale)
  const label = name ? t('availableOn', { package: name }) : t('notOnPackage')

  return (
    <button
      type="button"
      onClick={onOpenPackage}
      aria-label={t('packageChip', { note: label })}
      title={t('packageChip', { note: label })}
      className={cn(
        'ms-2 inline-flex items-center gap-1 rounded-full bg-accent-wash px-2 py-0.5 align-[1px]',
        'text-[11px] font-medium whitespace-nowrap text-accent transition-colors hover:bg-accent-wash-hover',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-on)]',
      )}
    >
      <Lock aria-hidden className="size-3" />
      {name ?? t('notOnPackage')}
    </button>
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
  const { t } = useTranslation('features')
  const save = useSaveMenuLanguages()

  const options = Object.keys(MENU_LANGUAGES)
    .filter((code) => code !== MAIN_LANGUAGE)
    .map((code) => ({ value: code, label: describe(code) }))

  const opening = secondLocale && defaultLocale === secondLocale ? secondLocale : MAIN_LANGUAGE

  return (
    <div className="mt-3 grid gap-4 rounded-[12px] border-[0.5px] border-[var(--line)] bg-[var(--bg)] p-3.5 sm:grid-cols-2">
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
        <Field label={t('languages.openingLabel')} className="pt-0">
          {() => (
            <Segmented
              aria-label={t('languages.openingLabel')}
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
