import {
  IconLanguage,
  type TablerIcon,
  IconQrcode,
  IconReceipt,
  IconToolsKitchen2,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import type { AuthRestaurant, Plan } from '@/features/auth'
import type { PackageFlag } from '@/features/package'
import { SectionCard } from '@/shared/components/ui'
import { FeatureRow, type FeatureKey } from '@/features/restaurant/components/features/feature-row'
import { MainLanguageField } from '@/features/restaurant/components/features/main-language-field'
import { useSaveSwitchedOff } from '@/features/restaurant/hooks/use-features'
import { cn } from '@/shared/utils/dom/cn'

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

/**
 * The package flags each feature needs one of (orders and orders at the
 * table come in two ways a package may sell apart), the first the one the
 * chip names when it has none.
 */
const ROWS: Record<FeatureKey, { plan: readonly [PackageFlag, ...PackageFlag[]] }> = {
  orders: { plan: ['ordering', 'menu_ordering'] },
  dine_in: { plan: ['dine_in', 'dine_in_whatsapp'] },
  variants: { plan: ['variants'] },
  addons: { plan: ['addons'] },
  languages: { plan: ['multiple_languages'] },
  qr: { plan: ['qr_studio'] },
  analytics: { plan: ['analytics'] },
}

type GroupKey = 'ordering' | 'dishes' | 'languages' | 'sharing'

const PICTURES = '/assets/images/dashboard/features'

/**
 * Related features together, in the sidebar's order: how orders come in,
 * the choices on a dish, the menu's languages, then sharing and what guests
 * do on the menu. Each card has its mark and its photo, as on Appearance.
 */
const GROUPS: { key: GroupKey; icon: TablerIcon; picture: string; rows: FeatureKey[] }[] = [
  {
    key: 'ordering',
    icon: IconReceipt,
    picture: `${PICTURES}/orders.webp`,
    rows: ['orders', 'dine_in'],
  },
  {
    key: 'dishes',
    icon: IconToolsKitchen2,
    picture: `${PICTURES}/dish.webp`,
    rows: ['variants', 'addons'],
  },
  { key: 'languages', icon: IconLanguage, picture: `${PICTURES}/lang.webp`, rows: ['languages'] },
  {
    key: 'sharing',
    icon: IconQrcode,
    picture: `${PICTURES}/analytics-qr.webp`,
    rows: ['qr', 'analytics'],
  },
]

/** Ordering, the tallest group, on its own; the rest stacked beside it. */
const COLUMNS = [GROUPS.slice(0, 1), GROUPS.slice(1)]

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
    // Two columns of groups on a wide screen, so a switch never sits a
    // whole screen away from what it turns on. Each column stacks on its
    // own: the tall ordering group leaves no hole beside it.
    <div className="grid flex-1 grid-cols-1 content-start items-start gap-4 xl:grid-cols-2">
      {COLUMNS.map((column) => (
        <div key={column[0]!.key} className="flex min-w-0 flex-col gap-4">
          {column.map((group) => (
            <SectionCard
              key={group.key}
              icon={<group.icon className="size-[18px]" stroke={1.8} />}
              picture={group.picture}
              // Small and whole in the corner: the switches start right under
              // the title, and each photo's subject stands in its middle.
              bleed={false}
              smallPicture
              title={t(`groups.${group.key}.title`)}
              description={t(`groups.${group.key}.description`)}
            >
              <div className="flex flex-col gap-3">
                {group.key === 'languages' ? (
                  <MainLanguageField
                    mainLocale={mainLocale}
                    secondLocale={secondLocale}
                    defaultLocale={defaultLocale}
                    canHaveSecond={plan.multiple_languages}
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
                      flags={ROWS[key].plan}
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
              </div>
            </SectionCard>
          ))}
        </div>
      ))}
    </div>
  )
}
