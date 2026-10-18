import { IconChevronRight, IconLock } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import {
  NAV_GROUPS,
  NAV_ITEMS,
  isNavItemHidden,
  isOnPlan,
  navLock,
  type NavAccess,
  type NavItem,
  type PhoneTab,
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
  qr: `${ART_DIR}/qr-studio.webp`,
  tables: `${ART_DIR}/table-order.webp`,
  'social-links': `${ART_DIR}/links.webp`,
  restaurant: `${ART_DIR}/restaurant-profile.webp`,
  features: `${ART_DIR}/features.webp`,
  package: `${ART_DIR}/packages.webp`,
  account: `${ART_DIR}/profile.webp`,
}

export type MorePageProps = {
  /** The phone's tabs: the pages they open are not repeated here. */
  tabs: readonly PhoneTab[]
  hasTemplate: boolean
  plan: NavAccess['plan']
  /** Sections the owner switched off; left out, as in the sidebar. */
  off: readonly string[]
  onOpen: (key: string) => void
}

/**
 * The last tab on a phone, under its heading in the topbar: every section
 * that is not a tab, as a card with its picture, in the sidebar's order,
 * then the owner's account across the width. A section waiting for a design
 * is shown locked, one the package lacks or the owner switched off is left
 * out, exactly as the sidebar does.
 */
export function MorePage({ tabs, hasTemplate, plan, off, onOpen }: MorePageProps) {
  const { t } = useTranslation()
  // Only the pages the tabs open: Categories and Table orders, which light
  // their tab up, still need a way in from here.
  const inTabs = new Set(tabs.map((tab) => tab.key))
  const account = NAV_ITEMS.find((item) => item.key === 'account')!
  // One grid in the sidebar's order: a group of one would leave half a row empty.
  const sections = NAV_GROUPS.flatMap((group) => group.items).filter(
    (item) => !inTabs.has(item.key) && !isNavItemHidden(item.key, off) && isOnPlan(item, plan),
  )

  return (
    <div className="flex flex-col gap-2.5">
      <nav aria-label={t('app.dashboard')} className="grid grid-cols-2 gap-2.5">
        {sections.map((item, at) => (
          <MoreCard
            key={item.key}
            item={item}
            locked={navLock(item.key, { hasTemplate, plan }) === 'template'}
            // A card left alone on the last row takes the whole row.
            wide={sections.length % 2 === 1 && at === sections.length - 1}
            onOpen={onOpen}
          />
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
