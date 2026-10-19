import { IconChevronRight, IconLock } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import {
  navItem,
  isNavItemHidden,
  isOnPlan,
  navLock,
  type NavAccess,
  type NavItem,
} from '@/app/layouts/authenticated/nav-items'
import { cn } from '@/shared/utils/dom/cn'
import type common from '@/locales/en/common.json'

/** Every section has a hint line in `common.json` (`more.hints`). */
type HintKey = keyof typeof common.more.hints

/**
 * Each tile's picture, by nav key, from `public/assets/images/dashboard/more`.
 * A tile without one shows none.
 */
const ART_DIR = '/assets/images/dashboard/more'
const ART: Record<string, string> = {
  analytics: `${ART_DIR}/analytics.webp`,
  'table-orders': `${ART_DIR}/table-orders.webp`,
  categories: `${ART_DIR}/category.webp`,
  design: `${ART_DIR}/design.webp`,
  appearance: `${ART_DIR}/Appearance.webp`,
  // From the Features page's pictures: no picture of their own here.
  dishes: '/assets/images/dashboard/features/dish.webp',
  orders: '/assets/images/dashboard/features/orders.webp',
  qr: `${ART_DIR}/qr-studio.webp`,
  tables: `${ART_DIR}/table-order.webp`,
  'social-links': `${ART_DIR}/links.webp`,
  restaurant: `${ART_DIR}/restaurant-profile.webp`,
  features: `${ART_DIR}/features.webp`,
  package: `${ART_DIR}/packages.webp`,
  account: `${ART_DIR}/profile.webp`,
}

/**
 * More's own groups, not the sidebar's: the menu first, then how it looks
 * and how it is shared, the two kinds of order with the tables, what guests
 * do, and the settings last. Every section is here but Home, the tabs' own
 * included, so More is the whole dashboard on one page.
 */
const GROUPS: { key: string; label: GroupLabel; items: string[] }[] = [
  { key: 'menu', label: 'nav.menu', items: ['categories', 'dishes'] },
  { key: 'look', label: 'nav.look', items: ['design', 'appearance'] },
  { key: 'sharing', label: 'nav.sharing', items: ['qr', 'social-links'] },
  { key: 'orders', label: 'nav.ordersGroup', items: ['orders', 'table-orders', 'tables'] },
  { key: 'insights', label: 'more.groups.insights', items: ['analytics'] },
  { key: 'settings', label: 'nav.settings', items: ['restaurant', 'features', 'package'] },
]

type GroupLabel =
  | 'nav.menu'
  | 'nav.look'
  | 'nav.sharing'
  | 'nav.ordersGroup'
  | 'more.groups.insights'
  | 'nav.settings'

export type MorePageProps = {
  hasTemplate: boolean
  plan: NavAccess['plan']
  /** Sections the owner switched off; left out, as in the sidebar. */
  off: readonly string[]
  onOpen: (key: string) => void
}

/**
 * The last tab on a phone, under its heading in the topbar: every section
 * but Home, as a card with its picture, in More's groups (`GROUPS`), then
 * the owner's account across the width. A section waiting for a design is shown locked, one the package
 * lacks or the owner switched off is left out, and a heading with nothing
 * left under it goes too, exactly as the sidebar does.
 */
export function MorePage({ hasTemplate, plan, off, onOpen }: MorePageProps) {
  const { t } = useTranslation()
  const account = navItem('account')!
  const groups = GROUPS.map((group) => ({
    group,
    items: group.items
      .map((key) => navItem(key)!)
      .filter((item) => !isNavItemHidden(item.key, off) && isOnPlan(item, plan)),
  })).filter(({ items }) => items.length > 0)

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label={t('app.dashboard')} className="flex flex-col gap-5">
        {groups.map(({ group, items }) => (
          <div key={group.key} className="flex flex-col gap-2">
            <h2 className="label-caps px-1 text-[var(--faint)]">{t(group.label)}</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {items.map((item, at) => (
                <MoreCard
                  key={item.key}
                  item={item}
                  locked={navLock(item.key, { hasTemplate, plan }) === 'template'}
                  // A card left alone on its last row takes the whole row.
                  wide={items.length % 2 === 1 && at === items.length - 1}
                  onOpen={onOpen}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
      <MoreCard item={account} wide onOpen={onOpen} />
    </div>
  )
}

function MoreCard({
  item,
  locked = false,
  wide = false,
  onOpen,
}: {
  item: NavItem
  locked?: boolean
  /** Across the whole width, the hint on one line beside the picture. */
  wide?: boolean
  onOpen: (key: string) => void
}) {
  const { t } = useTranslation()
  const Icon = locked ? IconLock : item.icon
  const art = ART[item.key]
  // A half-width card with a picture shows it whole, as a band across the top.
  const banner = art !== undefined && !wide
  const label = (
    <span
      className={cn(
        'min-w-0 flex-1',
        // A wide card's words stop where its picture turns solid.
        banner ? 'px-3 pt-1 pb-3' : art ? 'pe-[34%]' : 'pe-3',
      )}
    >
      <span className="block font-display text-[17px] leading-tight">{t(item.labelKey)}</span>
      <span
        id={`more-hint-${item.key}`}
        className="mt-0.5 block text-[11.5px] leading-snug text-[var(--muted)]"
      >
        {locked ? t('more.locked') : t(`more.hints.${item.key as HintKey}`)}
      </span>
    </span>
  )

  return (
    <button
      type="button"
      disabled={locked}
      onClick={() => onOpen(item.key)}
      aria-label={t(item.labelKey)}
      aria-describedby={`more-hint-${item.key}`}
      className={cn(
        '@container glass-card relative isolate flex min-w-0 overflow-hidden rounded-card text-start',
        // Without a picture, a phone's half-width card stacks the icon over
        // the text, so the words get the whole width; a roomier card puts
        // them side by side.
        banner
          ? 'flex-col'
          : wide
            ? 'col-span-2 min-h-[80px] items-center gap-3 p-3'
            : 'min-h-[116px] flex-col gap-2.5 p-3 @min-[13rem]:flex-row @min-[13rem]:gap-3',
        'transition-colors hover:bg-[var(--hover-wash)] disabled:cursor-not-allowed disabled:opacity-55',
        'focus-ring',
      )}
    >
      {banner ? (
        <span aria-hidden className="relative block aspect-video w-full shrink-0">
          <img
            src={art}
            alt=""
            loading="lazy"
            decoding="async"
            className="pointer-events-none absolute inset-0 size-full object-cover [mask-image:linear-gradient(to_bottom,#000_62%,transparent)]"
          />
          {/* The photo says what the section is; only a lock is added. */}
          {locked ? (
            <span className="gold-chip absolute start-2 top-2 grid size-8 place-items-center rounded-[10px]">
              <IconLock className="size-4" stroke={1.7} />
            </span>
          ) : null}
          <IconChevronRight className="absolute end-2 top-2.5 size-4 text-white/80 drop-shadow rtl:rotate-180" />
        </span>
      ) : (
        <>
          {art ? (
            // The picture fills the wide card's far side and fades out toward the text;
            // in Arabic it is mirrored, fade and all, so its subject stays in the corner.
            <img
              src={art}
              alt=""
              aria-hidden
              loading="lazy"
              decoding="async"
              className="pointer-events-none absolute inset-y-0 end-0 -z-10 h-full w-[45%] object-cover [mask-image:linear-gradient(to_left,#000_40%,transparent)] rtl:-scale-x-100"
            />
          ) : null}
          <span
            aria-hidden
            className="gold-chip grid size-9 shrink-0 place-items-center rounded-[11px]"
          >
            <Icon className="size-[18px]" stroke={1.7} />
          </span>
        </>
      )}
      {label}
      {banner ? null : (
        <IconChevronRight
          aria-hidden
          className="absolute end-2.5 top-3 size-4 text-[var(--faint)] rtl:rotate-180"
        />
      )}
    </button>
  )
}
