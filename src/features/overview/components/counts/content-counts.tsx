import {
  IconChevronRight,
  IconLayoutGrid,
  IconLink,
  IconToolsKitchen2,
  type TablerIcon,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { LimitBadge } from '@/shared/components/data-display'
import type { AuthRestaurant } from '@/features/auth'
import { formatNumber } from '@/shared/utils/format/number'
import { cn } from '@/shared/utils/dom/cn'
import { usePreferencesStore } from '@/stores/preferences.store'
type Limits = AuthRestaurant['limits']

const ITEMS: {
  key: keyof Limits
  page: string
  label: 'dishes' | 'categories' | 'socialLinks'
  icon: TablerIcon
  tint: string
  /** Whether the tile says what the package allows (not for the links). */
  showsLimit: boolean
}[] = [
  {
    key: 'dishes',
    page: 'dishes',
    label: 'dishes',
    icon: IconToolsKitchen2,
    tint: 'bg-accent-wash text-accent',
    showsLimit: true,
  },
  {
    key: 'categories',
    page: 'categories',
    label: 'categories',
    icon: IconLayoutGrid,
    tint: 'bg-[var(--tint-violet-wash)] text-[var(--tint-violet)]',
    showsLimit: true,
  },
  {
    key: 'social_links',
    page: 'social-links',
    label: 'socialLinks',
    icon: IconLink,
    tint: 'bg-[var(--live-wash)] text-[var(--live)]',
    showsLimit: false,
  },
]

export type ContentCountsProps = {
  limits: Limits
  /** Opens the section a tile counts. */
  onOpen: (key: string) => void
}

/**
 * Quick: how much is on the menu (dishes and categories against what the
 * package allows), each a tap from its page.
 */
export function ContentCounts({ limits, onOpen }: ContentCountsProps) {
  const { t } = useTranslation('overview')
  const locale = usePreferencesStore((state) => state.locale)

  return (
    <section aria-labelledby="quick-title" className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-0.5">
        <h3 id="quick-title" className="text-[20px] leading-tight">
          {t('quick.title')}
        </h3>
        <p className="text-[11px] text-[var(--muted)]">{t('quick.description')}</p>
      </div>
      <div className="grid grid-cols-3 gap-1.5 min-[380px]:gap-2">
        {ITEMS.map(({ key, page, label, icon: Icon, tint, showsLimit }) => {
          const { used, limit } = limits[key]
          return (
            <button
              key={key}
              type="button"
              onClick={() => onOpen(page)}
              className={cn(
                '@container flex min-w-0 flex-col gap-2 glass-card rounded-card p-2 text-start min-[380px]:p-2.5',
                'transition-colors hover:bg-[var(--hover-wash)]',
                'focus-ring',
              )}
            >
              {/* The label and the number beside the icon, the arrow at the end of
                  the number's line (short, so the label keeps the width); on the
                  narrowest phones all under the icon. */}
              <span className="grid grid-cols-1 gap-y-1 @min-[5rem]:grid-cols-[auto_minmax(0,1fr)_auto] @min-[5rem]:items-center @min-[5rem]:gap-x-1 @min-[5rem]:gap-y-0.5">
                <span
                  aria-hidden
                  className={cn(
                    'grid size-6 shrink-0 place-items-center rounded-full @min-[5rem]:row-span-2 @min-[6.5rem]:size-8',
                    tint,
                  )}
                >
                  <Icon className="size-3 @min-[6.5rem]:size-4" stroke={1.7} />
                </span>
                <span className="ps-0.5 text-[11px] leading-tight @min-[5rem]:col-span-2 @min-[6.5rem]:text-[12px]">
                  {t(`counts.${label}`)}
                </span>
                <IconChevronRight
                  aria-hidden
                  className="hidden size-3.5 shrink-0 text-[var(--faint)] @min-[5rem]:col-start-3 @min-[5rem]:row-start-2 @min-[5rem]:block rtl:rotate-180"
                />
                <span className="ps-0.5 text-[20px] leading-none font-semibold tabular-nums @min-[5rem]:col-start-2 @min-[5rem]:row-start-2">
                  {formatNumber(used, locale)}
                </span>
              </span>
              {/* At the tile's foot, so the three line up. */}
              {showsLimit ? (
                <span className="mt-auto text-[11px] leading-snug text-[var(--muted)]">
                  {limit === null ? (
                    t('counts.noLimit')
                  ) : (
                    <span className="flex flex-wrap items-center gap-1">
                      <LimitBadge used={used} limit={limit} />
                      {t('counts.onYourPackage')}
                    </span>
                  )}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </section>
  )
}
