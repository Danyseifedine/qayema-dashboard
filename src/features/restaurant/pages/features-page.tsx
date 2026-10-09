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
import type {
  AskLevel,
  AuthRestaurant,
  OrderMode,
  OrderType,
  Plan,
  WhatsAppFields,
} from '@/features/auth'
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
import {
  useSaveDineIn,
  useSaveOrdering,
  useSaveWhatsAppFields,
} from '@/features/restaurant/hooks/use-ordering-save'
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
  /** Opens the Restaurant page, to add the number WhatsApp sends to. */
  onOpenRestaurant: () => void
  /** Opens the Dishes page, to write what a new main language still lacks. */
  onOpenDishes: () => void
}

const ROWS: Record<FeatureKey, { icon: TablerIcon; plan: PackageFlag }> = {
  orders: { icon: IconReceipt, plan: 'ordering' },
  dine_in: { icon: IconToolsKitchen2, plan: 'dine_in' },
  variants: { icon: IconListCheck, plan: 'variants' },
  addons: { icon: IconCirclePlus, plan: 'addons' },
  languages: { icon: IconLanguage, plan: 'multiple_languages' },
  qr: { icon: IconQrcode, plan: 'qr_studio' },
  analytics: { icon: IconChartHistogram, plan: 'analytics' },
}

type GroupKey = 'ordering' | 'dishes' | 'languages' | 'sharing'

/**
 * Related features together, in the sidebar's order: how orders come in,
 * the choices on a dish, the menu's languages, then sharing and what guests
 * do on the menu.
 */
const GROUPS: { key: GroupKey; rows: FeatureKey[] }[] = [
  { key: 'ordering', rows: ['orders', 'dine_in'] },
  { key: 'dishes', rows: ['variants', 'addons'] },
  { key: 'languages', rows: ['languages'] },
  { key: 'sharing', rows: ['qr', 'analytics'] },
]

/**
 * One section per group of related features, each feature a switch. The
 * languages section starts with the menu's main language (every package has
 * one, in any language). Nothing is deleted by switching one off; see
 * `Restaurant::OPTIONAL_FEATURES` in ../qayema for what each one does.
 * Orders, ordering at the table and multiple languages carry their own
 * settings under their switch.
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
  onOpenRestaurant,
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

      {GROUPS.map((group) => (
        <FormSection
          key={group.key}
          title={t(`groups.${group.key}.title`)}
          description={t(`groups.${group.key}.description`)}
        >
          {group.key === 'languages' ? (
            <MainLanguageField
              mainLocale={mainLocale}
              secondLocale={secondLocale}
              defaultLocale={defaultLocale}
              onOpenDishes={onOpenDishes}
            />
          ) : null}
          <ul
            className={cn(
              'flex flex-col divide-y-[0.5px] divide-[var(--line-2)]',
              // Apart from the main language above it.
              group.key === 'languages' && 'border-t-[0.5px] border-[var(--line-2)]',
            )}
          >
            {group.rows.map((key) => (
              <FeatureRow
                key={key}
                feature={key}
                plan={plan}
                off={off}
                ordering={ordering}
                mainLocale={mainLocale}
                secondLocale={secondLocale}
                defaultLocale={defaultLocale}
                onToggle={toggle}
                onOpenPackage={onOpenPackage}
                onOpenTables={onOpenTables}
                onOpenRestaurant={onOpenRestaurant}
              />
            ))}
          </ul>
        </FormSection>
      ))}
    </div>
  )
}

/** One feature: its switch, and while on, the settings that come with it. */
function FeatureRow({
  feature: key,
  plan,
  off,
  ordering,
  mainLocale,
  secondLocale,
  defaultLocale,
  onToggle: toggle,
  onOpenPackage,
  onOpenTables,
  onOpenRestaurant,
}: Pick<
  FeaturesPageProps,
  | 'plan'
  | 'off'
  | 'ordering'
  | 'mainLocale'
  | 'secondLocale'
  | 'defaultLocale'
  | 'onOpenPackage'
  | 'onOpenTables'
  | 'onOpenRestaurant'
> & { feature: FeatureKey; onToggle: (key: FeatureKey, on: boolean) => void }) {
  const { t } = useTranslation('features')
  const row = ROWS[key]
  const Icon = row.icon
  // Without the package a feature is off whatever the owner chose; their
  // choice is kept and applies again once the package has it.
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
            {included ? null : <PackageChip flag={row.plan} onOpenPackage={onOpenPackage} />}
          </p>
          <p className="text-[12.5px] leading-snug text-[var(--muted)]">
            {t(`${key}.description`)}
          </p>
          {included && !on && offNote ? (
            <p className="mt-1 text-[12.5px] leading-snug text-[var(--status-warn)]">{offNote}</p>
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
      {key === 'dine_in' && on ? (
        <div className="sm:ms-12">
          <DineInChoice ordering={ordering} onOpenRestaurant={onOpenRestaurant} />
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
}

/**
 * How orders at the table come in, apart from delivery and pickup: on the
 * Table orders page (followed by the guest, with a sound here) or on
 * WhatsApp with the table's name on top. WhatsApp needs the restaurant's
 * number; without one the server keeps them here, and this says so.
 */
function DineInChoice({
  ordering,
  onOpenRestaurant,
}: {
  ordering: AuthRestaurant['ordering']
  onOpenRestaurant: () => void
}) {
  const { t } = useTranslation('features')
  const save = useSaveDineIn()
  const mode = ordering.dine_in
  const noNumber = !ordering.whatsapp_number

  return (
    <div className="mt-3 grid gap-3 rounded-[12px] border-[0.5px] border-[var(--line)] bg-[var(--bg)] p-3.5">
      <Field
        label={t('dine_in.modeLabel')}
        hint={t(mode === 'whatsapp' ? 'dine_in.whatsappHint' : 'dine_in.dashboardHint')}
        className="pt-0"
      >
        {() => (
          <Segmented
            aria-label={t('dine_in.modeLabel')}
            value={mode}
            onChange={(next) => {
              if (next !== mode) {
                save.mutate(next)
              }
            }}
            options={[
              { value: 'menu', label: t('dine_in.dashboard') },
              {
                value: 'whatsapp',
                label: t('orders.whatsapp'),
                // Chosen before the number went: it stays, so the owner can
                // move back to the dashboard from it.
                disabled: noNumber && mode !== 'whatsapp',
              },
            ]}
          />
        )}
      </Field>
      {noNumber ? (
        <p className="text-[12.5px] leading-snug text-[var(--status-warn)]">
          {t(mode === 'whatsapp' ? 'dine_in.noNumber' : 'dine_in.needsNumber')}{' '}
          <Button
            variant="link"
            size="sm"
            onClick={onOpenRestaurant}
            className="h-auto px-0 align-baseline text-[12.5px] font-medium"
          >
            {t('dine_in.addNumber')}
          </Button>
        </p>
      ) : null}
      {mode === 'whatsapp' ? <AskGuestsFor set="table" fields={ordering.whatsapp_fields} /> : null}
    </div>
  )
}

const ASK_LEVELS: readonly AskLevel[] = ['off', 'optional', 'required']

type AskField = keyof WhatsAppFields['away']

/**
 * What a WhatsApp order asks the guest for before WhatsApp opens: `away`
 * (delivery and pickup) has a name, a phone and a delivery address, `table`
 * a name and a phone. Each is off, optional or required, and a change saves
 * the whole set with that one value changed.
 */
function AskGuestsFor({ set, fields }: { set: keyof WhatsAppFields; fields: WhatsAppFields }) {
  const { t } = useTranslation('features')
  const save = useSaveWhatsAppFields()
  // The table's set has no address; it is never shown for it.
  const current: Record<AskField, AskLevel> = { address: 'off', ...fields[set] }
  const keys: readonly AskField[] =
    set === 'away' ? ['name', 'phone', 'address'] : ['name', 'phone']

  const choose = (key: AskField, level: AskLevel) => {
    if (level === current[key]) return
    save.mutate({ ...fields, [set]: { ...fields[set], [key]: level } })
  }

  return (
    <fieldset className="grid gap-3">
      <legend className="pb-2 text-[13px] font-medium text-[var(--text)]">
        {t('askFor.label')}
      </legend>
      {keys.map((key) => {
        const label = t(`askFor.fields.${key}`)
        return (
          <div key={key} className="grid gap-1">
            <div className="flex flex-wrap items-center justify-between gap-x-3.5 gap-y-1.5">
              <span className="min-w-0 text-[13.5px] text-[var(--text)]">{label}</span>
              <Segmented
                size="sm"
                aria-label={t('askFor.what', { field: label })}
                value={current[key]}
                onChange={(level) => choose(key, level)}
                options={ASK_LEVELS.map((level) => ({
                  value: level,
                  label: t(`askFor.levels.${level}`),
                }))}
              />
            </div>
            {key === 'address' ? (
              <span className="text-[12px] leading-[1.45] text-[var(--muted)]">
                {t('askFor.addressHint')}
              </span>
            ) : null}
          </div>
        )
      })}
      <p className="text-[12px] leading-[1.45] text-[var(--muted)]">{t('askFor.hint')}</p>
    </fieldset>
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
  // On WhatsApp the guest picks delivery or pickup only once the address is asked.
  const asksType = mode === 'menu' || ordering.whatsapp_fields.away.address !== 'off'

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

      {mode === 'whatsapp' ? <AskGuestsFor set="away" fields={ordering.whatsapp_fields} /> : null}

      {asksType ? (
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
                    {t(
                      mode === 'menu'
                        ? `orders.typeHints.${type}`
                        : `orders.whatsappTypeHints.${type}`,
                    )}
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
function MainLanguageField({
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
    <>
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
    </>
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
