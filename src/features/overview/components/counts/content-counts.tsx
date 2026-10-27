import {
  IconLayoutGrid,
  IconLink,
  IconSparkles,
  IconToolsKitchen2,
  type TablerIcon,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { LimitBadge, ProgressBar } from '@/shared/components/data-display'
import type { AuthRestaurant } from '@/features/auth'
import type { WritingHelpCredits } from '@/shared/hooks/use-writing-help'
import { formatDay, todayDay } from '@/shared/utils/format/date'
import { formatNumber } from '@/shared/utils/format/number'
import { usePreferencesStore } from '@/stores/preferences.store'
import { HomeTile, HomeTiles } from '@/features/overview/components/counts/home-tile'

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
  /** The month's AI credits; their tile shows only while the AI is on and capped. */
  credits?: WritingHelpCredits | null
  /** Opens the section a tile counts. */
  onOpen: (key: string) => void
}

/**
 * Quick: how much is on the menu (dishes and categories against what the
 * package allows), and the AI credits left this month, each a tap from its
 * page.
 */
export function ContentCounts({ limits, credits = null, onOpen }: ContentCountsProps) {
  const { t } = useTranslation('overview')
  const locale = usePreferencesStore((state) => state.locale)
  const capped = credits?.limit != null ? { ...credits, limit: credits.limit } : null

  return (
    <HomeTiles title={t('quick.title')} note={t('quick.description')} columns={capped ? 4 : 3}>
      {ITEMS.map(({ key, page, label, icon, tint, showsLimit }) => {
        const { used, limit } = limits[key]
        return (
          <HomeTile
            key={key}
            icon={icon}
            tint={tint}
            label={t(`counts.${label}`)}
            value={formatNumber(used, locale)}
            onClick={() => onOpen(page)}
            foot={
              showsLimit ? (
                <span className="text-[var(--muted)]">
                  {limit === null ? (
                    t('counts.noLimit')
                  ) : (
                    <span className="flex flex-wrap items-center gap-1">
                      <LimitBadge used={used} limit={limit} />
                      {t('counts.onYourPackage')}
                    </span>
                  )}
                </span>
              ) : null
            }
          />
        )
      })}
      {capped ? <CreditsTile credits={capped} onOpen={() => onOpen('package')} /> : null}
    </HomeTiles>
  )
}

/**
 * The AI credits left this month out of the package's, a bar of what is
 * left, and once none are, the day they come back. Credits, never money.
 */
function CreditsTile({
  credits,
  onOpen,
}: {
  credits: WritingHelpCredits & { limit: number }
  onOpen: () => void
}) {
  const { t } = useTranslation('overview')
  const locale = usePreferencesStore((state) => state.locale)
  // Back once their day comes, whatever an open tab still holds.
  const back = todayDay() >= credits.resets_on
  const left = back ? credits.limit : (credits.left ?? credits.limit)
  // Too few for even a translation is as good as none.
  const spent = left < credits.prices.translation

  return (
    <HomeTile
      icon={IconSparkles}
      tint="bg-accent-wash text-accent"
      label={t('counts.aiCredits')}
      value={formatNumber(left, locale)}
      onClick={onOpen}
      foot={
        <span className="flex flex-col gap-1.5">
          <ProgressBar value={left} max={credits.limit} />
          {spent ? (
            <span className="font-medium text-status-danger">
              {t('counts.creditsBack', { date: formatDay(credits.resets_on, locale) })}
            </span>
          ) : (
            <span className="text-[var(--muted)]">
              {t('counts.creditsLeft', { limit: formatNumber(credits.limit, locale) })}
            </span>
          )}
        </span>
      }
    />
  )
}
