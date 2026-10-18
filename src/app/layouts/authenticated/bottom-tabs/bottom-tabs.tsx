import { startTransition, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { phoneTabOf, type PhoneTab } from '@/app/layouts/authenticated/nav-items'
import { cn } from '@/shared/utils/dom/cn'

export type BottomTabsProps = {
  tabs: readonly PhoneTab[]
  activeKey: string
  onSelect: (key: string) => void
  /** A count to wear on a tab, by the pages it covers: orders waiting. */
  counts?: Partial<Record<string, number>>
}

const NO_COUNTS: Partial<Record<string, number>> = {}

/**
 * The phone's navigation: four tabs along the bottom, where the thumb is,
 * in place of the sidebar (below `lg`), on a frosted bar with rounded top
 * corners, finished like Home's cards; one gold-tinted card slides to the
 * open tab. More holds every other section.
 */
export function BottomTabs({ tabs, activeKey, onSelect, counts = NO_COUNTS }: BottomTabsProps) {
  const { t } = useTranslation()
  // The tab tapped moves the card at once, as its own small update; the page
  // it opens follows as a transition, so drawing it never holds the bar back.
  // Once the page has changed, the tap is history and the page decides again.
  const [pressed, setPressed] = useState<{ key: string; from: string } | null>(null)
  const current = pressed && pressed.from === activeKey ? pressed.key : phoneTabOf(activeKey, tabs)
  const index = tabs.findIndex((tab) => tab.key === current)

  const select = (key: string) => {
    setPressed({ key, from: activeKey })
    startTransition(() => onSelect(key))
  }

  // The bar's height, the phone's bottom inset included, as --tabbar-height:
  // a Save bar pinned above it (.sticky-actions) sits on it exactly. Hidden
  // from lg, it measures 0 there.
  const bar = useRef<HTMLElement>(null)
  useEffect(() => {
    // Set by the time effects run: the bar is always drawn.
    const element = bar.current!
    const root = document.documentElement
    const observer = new ResizeObserver(() =>
      root.style.setProperty('--tabbar-height', `${element.offsetHeight}px`),
    )
    observer.observe(element)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--tabbar-height')
    }
  }, [])

  return (
    <nav
      ref={bar}
      aria-label={t('layout.tabs')}
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 rounded-t-[20px] lg:hidden',
        'tab-bar shadow-[var(--tabbar-edge)]',
        'px-2.5 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))]',
      )}
    >
      <div className="relative grid grid-cols-4 gap-1.5">
        {/* One gold card that slides to the open tab (a quarter of the row,
            moved a tab and a gap at a time; the other way in Arabic). */}
        <span
          aria-hidden
          style={{ '--tab': index } as CSSProperties}
          className={cn(
            'pointer-events-none absolute inset-y-0 start-0 w-[calc((100%-1.125rem)/4)] rounded-[14px]',
            'bg-[image:var(--tab-on)] shadow-[var(--tab-on-edge)]',
            '[transform:translateX(calc(var(--tab)*(100%+0.375rem)))]',
            'rtl:[transform:translateX(calc(var(--tab)*-1*(100%+0.375rem)))]',
            'transition-[transform,opacity] duration-[260ms] ease-[cubic-bezier(0.2,0.9,0.3,1)] will-change-transform motion-reduce:transition-none',
          )}
        />
        {tabs.map((tab) => {
          const active = tab.key === current
          const waiting = tab.covers.reduce((sum, key) => sum + (counts[key] ?? 0), 0)
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => select(tab.key)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative grid justify-items-center gap-0.5 rounded-[14px] py-1.5 text-[11px]',
                'transition-colors duration-200',
                'focus-ring',
                active ? 'font-semibold text-accent' : 'font-medium text-[var(--muted)]',
              )}
            >
              {/* The open tab's icon rises a little as the card arrives. */}
              <Icon
                aria-hidden
                className={cn(
                  'size-5 transition-[transform,color] duration-[260ms] ease-[cubic-bezier(0.2,0.9,0.3,1)] motion-reduce:transition-none',
                  active
                    ? '-translate-y-px scale-110'
                    : 'text-[color-mix(in_srgb,var(--text)_78%,transparent)]',
                )}
                stroke={1.6}
              />
              {t(tab.labelKey)}
              {waiting > 0 ? (
                // Labelled like the sidebar's count, so the tab reads "Orders, 3 orders waiting".
                <span
                  aria-label={t('sidebar.waiting', { count: waiting })}
                  className="absolute top-1 start-[calc(50%+6px)] grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--status-warn)] px-1 text-[11px] font-bold text-white ring-2 ring-[var(--bg)] tabular-nums"
                >
                  {waiting}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
