import {
  IconChartHistogram,
  IconCirclePlus,
  IconLanguage,
  IconListCheck,
  IconLock,
  type TablerIcon,
  IconQrcode,
  IconReceipt,
  IconToolsKitchen2,
} from '@tabler/icons-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AuthRestaurant, OrderMode, OrderType, Plan } from '@/features/auth'
import { usePackageFor, type PackageFlag } from '@/features/package'
import { ConfirmDialog } from '@/shared/components/feedback'
import { Field, FormSection } from '@/shared/components/forms'
import { Alert, Button, Combobox, Segmented, Switch } from '@/shared/components/ui'
import { MENU_LANGUAGES, languageName } from '@/shared/constants/menu-languages'
import {
  useMenuLanguagesState,
  useSaveMenuLanguages,
} from '@/features/restaurant/hooks/use-menu-languages-save'
import { useSaveSwitchedOff } from '@/features/restaurant/hooks/use-features'
import { useSaveOrdering } from '@/features/restaurant/hooks/use-ordering-save'
import { usePreferencesStore } from '@/stores/preferences.store'
import { cn } from '@/shared/utils/dom/cn'

type FeatureKey = 'orders' | 'dine_in' | 'variants' | 'addons' | 'qr' | 'analytics' | 'languages'

export type FeaturesPageProps = {
  /** Features the owner switched off. */
  off: readonly string[]
  /** What the package includes, to mark a feature it does not. */
  plan: Plan
  /** The language every name is written in. */
  mainLocale: string
  /** The second language chosen, kept even while languages are off. */
  secondLocale: string | null
  /** What the menu opens in. */
  defaultLocale: string
  /** How guests send their orders, and which kinds the menu takes. */
  ordering: AuthRestaurant['ordering']
  /** Opens the Package page, from a feature the package does not include. */
  onOpenPackage: () => void
  /** Opens the Tables page, from ordering at the table. */
  onOpenTables: () => void
  /** Opens the Dishes page, to write what a new main language still lacks. */
  onOpenDishes: () => void
}

const ROWS: { key: FeatureKey; icon: TablerIcon; plan: PackageFlag }[] = [
  { key: 'orders', icon: IconReceipt, plan: 'ordering' },
  { key: 'dine_in', icon: IconToolsKitchen2, plan: 'dine_in' },
  { key: 'variants', icon: IconListCheck, plan: 'variants' },
  { key: 'addons', icon: IconCirclePlus, plan: 'addons' },
  { key: 'qr', icon: IconQrcode, plan: 'qr_studio' },
  { key: 'analytics', icon: IconChartHistogram, plan: 'analytics' },
  { key: 'languages', icon: IconLanguage, plan: 'multiple_languages' },
]

/**
 * The menu's main language first (every package has one, in any language),
 * then one switch per optional feature, in the order owners think about
 * them. Nothing is deleted by switching one off; see
 * `Restaurant::OPTIONAL_FEATURES` in ../qayema for what each one does.
 * "Multiple languages" carries its own settings: which second language, and
 * which one the menu opens in.
 */
export function FeaturesPage({
  off,
  plan,
  mainLocale,
  secondLocale,
  defaultLocale,
  ordering,
  onOpenPackage,
  onOpenTables,
  onOpenDishes,
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

      <MainLanguageSection
        mainLocale={mainLocale}
        secondLocale={secondLocale}
        defaultLocale={defaultLocale}
        onOpenDishes={onOpenDishes}
      />

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
              <li key={key} className="py-3.5">
                <div className="flex items-start gap-3">
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
                    {key === 'dine_in' && on ? (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={onOpenTables}
                        className="mt-1 h-auto px-0 text-[12.5px] font-medium"
                      >
                        {t('dine_in.openTables')}
                      </Button>
                    ) : null}
                  </div>
                  <Switch
                    checked={on}
                    disabled={!included}
                    onChange={(next) => toggle(key, next)}
                    aria-label={t('toggle', { feature: label })}
                    className="mt-1.5"
                  />
                </div>
                {/* Under the row, not beside the switch: the whole width on a
                    phone, under the text from a tablet up. The pickers need the
                    package: the server refuses a second language without it. */}
                {key === 'orders' && on ? (
                  <div className="sm:ms-12">
                    <OrderingChoice
                      ordering={ordering}
                      menuIncluded={plan.menu_ordering}
                      onOpenPackage={onOpenPackage}
                    />
                  </div>
                ) : null}
                {key === 'languages' && on ? (
                  <div className="sm:ms-12">
                    <LanguageChoice
                      mainLocale={mainLocale}
                      secondLocale={secondLocale}
                      defaultLocale={defaultLocale}
                    />
                  </div>
                ) : null}
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
      <IconLock aria-hidden className="size-3" />
      {name ?? t('notOnPackage')}
    </button>
  )
}

const ORDER_TYPES: readonly OrderType[] = ['delivery', 'pickup']

/**
 * How guests send their orders: to WhatsApp, or in the menu (its own
 * package flag) with delivery, pickup or both. One way at a time, so the
 * owner never wonders where an order went. At least one stays on, or
 * nobody could order. Ordering at the table is a feature of its own, with
 * its own row. Saves on change.
 */
function OrderingChoice({
  ordering,
  menuIncluded,
  onOpenPackage,
}: {
  ordering: AuthRestaurant['ordering']
  menuIncluded: boolean
  onOpenPackage: () => void
}) {
  const { t } = useTranslation('features')
  const save = useSaveOrdering()
  const { mode, types } = ordering

  const setMode = (next: OrderMode) => {
    if (next !== mode) save.mutate({ mode: next, types })
  }
  const setType = (type: OrderType, on: boolean) => {
    const next = on ? [...types, type] : types.filter((current) => current !== type)
    // Kept in the server's order, so the optimistic copy matches what comes back.
    save.mutate({ mode, types: ORDER_TYPES.filter((current) => next.includes(current)) })
  }

  return (
    <div className="mt-3 grid gap-4 rounded-[12px] border-[0.5px] border-[var(--line)] bg-[var(--bg)] p-3.5">
      <Field
        label={t('orders.modeLabel')}
        hint={t(mode === 'menu' ? 'orders.menuHint' : 'orders.whatsappHint')}
        className="pt-0"
      >
        {() => (
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              aria-label={t('orders.modeLabel')}
              value={mode}
              onChange={setMode}
              options={[
                { value: 'whatsapp', label: t('orders.whatsapp') },
                {
                  value: 'menu',
                  label: t('orders.menu'),
                  disabled: !menuIncluded,
                  icon: menuIncluded ? undefined : <IconLock aria-hidden className="size-3" />,
                },
              ]}
            />
            {menuIncluded ? null : (
              <PackageChip flag="menu_ordering" onOpenPackage={onOpenPackage} />
            )}
          </div>
        )}
      </Field>

      {mode === 'menu' ? (
        <fieldset className="grid gap-2.5">
          <legend className="pb-2 text-[13px] font-medium text-[var(--text)]">
            {t('orders.typesLabel')}
          </legend>
          {ORDER_TYPES.map((type) => {
            const on = types.includes(type)
            const labelId = `order-type-${type}`
            const hintId = `order-type-${type}-hint`
            return (
              <div key={type} className="flex items-start justify-between gap-3.5">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span id={labelId} className="text-[13.5px] text-[var(--text)]">
                    {t(`orders.types.${type}`)}
                  </span>
                  <span id={hintId} className="text-[12px] leading-[1.45] text-[var(--muted)]">
                    {t(`orders.typeHints.${type}`)}
                  </span>
                </div>
                <Switch
                  checked={on}
                  // The last kind left on stays on.
                  disabled={on && types.length === 1}
                  onChange={(next) => setType(type, next)}
                  aria-labelledby={labelId}
                  aria-describedby={hintId}
                />
              </div>
            )
          })}
        </fieldset>
      ) : null}
    </div>
  )
}

/** Which second language, and which of the two the menu opens in. Saves on change. */
type Languages = { main_locale: string; second_locale: string | null; default_locale: string }

/**
 * The languages with a new main one, as `MenuLanguages::withMain()` in
 * ../qayema: the second language chosen as main swaps with the old main (both
 * texts already exist), another keeps the second; the menu keeps opening in
 * the main language if it did.
 */
function withMain(current: Languages, main: string): Languages {
  const oldMain = current.main_locale
  const second = current.second_locale === main ? oldMain : current.second_locale
  const opening =
    current.default_locale === oldMain || ![main, second].includes(current.default_locale)
      ? main
      : current.default_locale
  return { main_locale: main, second_locale: second, default_locale: opening }
}

/**
 * The language the menu is written in: every name is required in it, and it
 * is the only one shown while "Multiple languages" is off or not on the
 * package. Any package picks it. Making the second language the main one is
 * a swap and saves at once; a brand-new one asks first, since what is
 * written keeps its old language until it is written again, and says how
 * much is left to write.
 */
function MainLanguageSection({
  mainLocale,
  secondLocale,
  defaultLocale,
  onOpenDishes,
}: {
  mainLocale: string
  secondLocale: string | null
  defaultLocale: string
  onOpenDishes: () => void
}) {
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
    label: describe(code),
  }))
  const missing = state.data?.missing
  const left = (missing?.categories ?? 0) + (missing?.dishes ?? 0)

  const choose = (next: string | null) => {
    if (!next || next === mainLocale) return
    if (next === secondLocale) {
      save.mutate(withMain(current, next))
      return
    }
    setPending(next)
  }

  return (
    <FormSection title={t('mainLanguage.title')} description={t('mainLanguage.description')}>
      <Field label={t('mainLanguage.label')} hint={t('mainLanguage.hint')} className="pt-0">
        {({ id, describedBy }) => (
          <Combobox
            id={id}
            aria-describedby={describedBy}
            options={options}
            value={mainLocale}
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
          save.mutate(withMain(current, pending), { onSettled: () => setPending(null) })
        }}
      />
    </FormSection>
  )
}

function LanguageChoice({
  mainLocale,
  secondLocale,
  defaultLocale,
}: {
  mainLocale: string
  secondLocale: string | null
  defaultLocale: string
}) {
  const { t } = useTranslation('features')
  const save = useSaveMenuLanguages()

  const options = Object.keys(MENU_LANGUAGES)
    .filter((code) => code !== mainLocale)
    .map((code) => ({ value: code, label: describe(code) }))

  const opening = secondLocale && defaultLocale === secondLocale ? secondLocale : mainLocale

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

/** "French · Français"; one name when both are the same word. */
function describe(code: string): string {
  const name = languageName(code)
  const native = MENU_LANGUAGES[code]?.name
  return !native || native === name ? name : `${name} · ${native}`
}
