import { IconCrown } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import type { PackageTier } from '@/app/layouts/authenticated/topbar/package-tier'
import { cn } from '@/shared/utils/dom/cn'

/** Each metal's fill and the ink on it, the same in both themes. */
const METAL: Record<PackageTier, string> = {
  bronze:
    'bg-[linear-gradient(135deg,#f3c191_0%,#c07a3a_55%,#7b4519_100%)] text-[#2a1405] shadow-[inset_0_1px_0_rgb(255_255_255/0.45)]',
  silver:
    'bg-[linear-gradient(135deg,#ffffff_0%,#c9ced6_55%,#868d98_100%)] text-[#1d2128] shadow-[inset_0_1px_0_rgb(255_255_255/0.7)]',
  gold: 'bg-[linear-gradient(135deg,#fff3c4_0%,#f7c843_45%,#d07a0c_100%)] text-[#3a2000] shadow-[inset_0_1px_0_rgb(255_255_255/0.6)]',
}

/** The days badge's edge, in the crown's own metal. */
const EDGE: Record<PackageTier, string> = {
  bronze: 'border-[#c07a3a]',
  silver: 'border-[#c9ced6]',
  gold: 'border-[#f7c843]',
}

/** From this many days left the count turns amber. */
const ENDING_SOON_DAYS = 7

export type PackagePillProps = {
  /** The package's name in the current language, for screen readers. */
  label: string
  tier: PackageTier
  /** Whole days until the package ends (0 on its last day); null when it does not end. */
  daysLeft?: number | null
  onClick?: () => void
}

/**
 * Which package the restaurant is on, always visible because every limit in
 * the dashboard comes from it: a crown in its metal (bronze Free, silver Pro,
 * gold Premium), no text, and on its corner a small round count of the days
 * until it is paid again, edged in the same metal (amber in the last week). Clicking it opens the package
 * page.
 */
export function PackagePill({ label, tier, daysLeft = null, onClick }: PackagePillProps) {
  const { t } = useTranslation()
  const endingSoon = daysLeft !== null && daysLeft <= ENDING_SOON_DAYS
  const name =
    daysLeft === null
      ? t('packagePill.label', { name: label })
      : daysLeft === 0
        ? t('packagePill.labelEndsToday', { name: label })
        : t('packagePill.labelDaysLeft', { name: label, count: daysLeft })

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={name}
      title={label}
      data-tier={tier}
      className={cn(
        'relative grid size-9 shrink-0 place-items-center rounded-full',
        'transition-transform duration-200 hover:scale-105',
        'focus-ring',
        METAL[tier],
      )}
    >
      <IconCrown aria-hidden className="size-[18px]" stroke={1.8} />
      {daysLeft !== null ? (
        <span
          aria-hidden
          data-ending-soon={endingSoon || undefined}
          className={cn(
            // A true circle, edged in the crown's metal.
            'absolute -end-1.5 -top-1.5 grid size-5 place-items-center rounded-full border-[1.5px]',
            'leading-none font-bold tabular-nums',
            daysLeft > 99 ? 'text-[7px]' : 'text-[8.5px]',
            EDGE[tier],
            // Dark in both themes, with a faint edge so it still shows on black.
            endingSoon
              ? 'bg-[var(--status-warn)] text-white'
              : 'bg-[#1a1712] text-[#f5f1e8] shadow-[inset_0_0_0_0.5px_rgb(255_255_255/0.28)]',
          )}
        >
          {daysLeft > 99 ? '99+' : daysLeft}
        </span>
      ) : null}
    </button>
  )
}
