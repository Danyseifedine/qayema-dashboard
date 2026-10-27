import { useTranslation } from 'react-i18next'
import type { AuthRestaurant, Plan } from '@/features/auth'
import type { PackageFlag } from '@/features/package'
import { Button, HelperText, Switch } from '@/shared/components/ui'
import { DineInChoice } from '@/features/restaurant/components/features/dine-in-choice'
import { LanguageChoice } from '@/features/restaurant/components/features/language-choice'
import { OrderingChoice } from '@/features/restaurant/components/features/ordering-choice'
import { LockedFeature } from '@/features/restaurant/components/features/locked-feature'

/** A feature the owner may switch off, as `Restaurant::OPTIONAL_FEATURES` names it. */
export type FeatureKey =
  'orders' | 'dine_in' | 'variants' | 'addons' | 'qr' | 'analytics' | 'languages'

type FeatureRowProps = {
  feature: FeatureKey
  /** The package flags that include it, any one of them; the chip names the first. */
  flags: readonly [PackageFlag, ...PackageFlag[]]
  plan: Plan
  /** Features the owner switched off. */
  off: readonly string[]
  ordering: AuthRestaurant['ordering']
  mainLocale: string
  secondLocale: string | null
  defaultLocale: string
  onToggle: (key: FeatureKey, on: boolean) => void
  onOpenPackage: () => void
  onOpenTables: () => void
  onOpenRestaurant: () => void
}

/** One feature: its switch, and while on, the settings that come with it. */
export function FeatureRow({
  feature: key,
  flags,
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
}: FeatureRowProps) {
  const { t } = useTranslation('features')
  // Without the package a feature is off whatever the owner chose; their
  // choice is kept and applies again once the package has it.
  const included = flags.some((flag) => plan[flag])
  const on = included && !off.includes(key)
  const label = t(`${key}.label`)
  const offNote = key === 'analytics' ? null : t(`${key}.offNote`)

  return (
    <li className="py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium">{label}</p>
          <p className="mt-0.5 text-[12px] leading-snug text-[var(--muted)]">
            {t(`${key}.description`)}
          </p>
          {included && !on && offNote ? (
            <HelperText tone="warning" className="mt-1">
              {offNote}
            </HelperText>
          ) : null}
          {key === 'dine_in' && on ? (
            <Button
              variant="link"
              size="sm"
              onClick={onOpenTables}
              className="mt-1 h-auto px-0 text-[12px] font-medium"
            >
              {t('dine_in.openTables')}
            </Button>
          ) : null}
        </div>
        {/* Without the package there is nothing to switch: the strip below
            says where it comes from instead. */}
        {included ? (
          <Switch
            checked={on}
            onChange={(next) => toggle(key, next)}
            aria-label={t('toggle', { feature: label })}
            className="mt-0.5"
          />
        ) : null}
      </div>
      {included ? null : <LockedFeature flag={flags[0]} onOpenPackage={onOpenPackage} />}
      {/* Under the row, across its width. The pickers need the package:
          the server refuses a second language without it. */}
      {key === 'orders' && on ? (
        <OrderingChoice
          ordering={ordering}
          whatsappIncluded={plan.ordering}
          menuIncluded={plan.menu_ordering}
        />
      ) : null}
      {key === 'dine_in' && on ? (
        <DineInChoice
          ordering={ordering}
          menuIncluded={plan.dine_in}
          whatsappIncluded={plan.dine_in_whatsapp}
          onOpenRestaurant={onOpenRestaurant}
        />
      ) : null}
      {key === 'languages' && on ? (
        <LanguageChoice
          mainLocale={mainLocale}
          secondLocale={secondLocale}
          defaultLocale={defaultLocale}
        />
      ) : null}
    </li>
  )
}
