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
 * Each tile's picture, by nav key: `src/assets/images/more/<key>.webp`. A
 * tile without one shows none, so a picture appears by adding its file.
 */
const ART: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('/src/assets/images/more/*.webp', {
      eager: true,
      query: '?url',
      import: 'default',
    }),
  ).map(([path, url]) => [path.replace(/^.*\/|\.webp$/g, ''), url]),
)

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

  return (
    <button
      type="button"
      disabled={locked}
      onClick={() => onOpen(item.key)}
      aria-label={t(item.labelKey)}
      aria-describedby={`more-hint-${item.key}`}
      className={cn(
        '@container glass-card relative isolate flex min-w-0 overflow-hidden rounded-[18px] p-3 text-start',
        // A phone's half-width card stacks the icon over the text, so the
        // words get the whole width; a roomier card puts them side by side.
        wide
          ? 'col-span-2 min-h-[80px] items-center gap-3'
          : 'min-h-[116px] flex-col gap-2.5 @min-[13rem]:flex-row @min-[13rem]:gap-3',
        'transition-colors hover:bg-[var(--hover-wash)] disabled:cursor-not-allowed disabled:opacity-55',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-on)]',
      )}
    >
      {art ? (
        // The picture fills the card's far side and fades out toward the text.
        <img
          src={art}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className={cn(
            'pointer-events-none absolute inset-y-0 end-0 -z-10 h-full object-cover',
            wide ? 'w-[45%]' : 'w-[62%]',
            '[mask-image:linear-gradient(to_left,#000_40%,transparent)] rtl:[mask-image:linear-gradient(to_right,#000_40%,transparent)]',
          )}
        />
      ) : null}
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-[12px] bg-accent-wash text-accent"
      >
        <Icon className="size-[18px]" stroke={1.7} />
      </span>
      <span className="min-w-0 flex-1 pe-3">
        <span className="block font-display text-[17px] leading-tight">{t(item.labelKey)}</span>
        <span
          id={`more-hint-${item.key}`}
          className="mt-0.5 block text-[11.5px] leading-snug text-[var(--muted)]"
        >
          {locked ? t('more.locked') : t(`more.hints.${item.key as HintKey}`)}
        </span>
      </span>
      <IconChevronRight
        aria-hidden
        className="absolute end-2.5 top-3 size-4 text-[var(--faint)] rtl:rotate-180"
      />
    </button>
  )
}
