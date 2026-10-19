import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ErrorState, Skeleton, SkeletonList } from '@/shared/components/feedback'
import { FormSection } from '@/shared/components/forms'
import type { Locale } from '@/shared/constants/locales'
import { BusyTimesChart } from '@/features/analytics/components/charts/busy-times-chart'
import { RankedList } from '@/features/analytics/components/charts/ranked-list'
import { VisitsChart } from '@/features/analytics/components/charts/visits-chart'
import { RangePicker } from '@/features/analytics/components/range/range-picker'
import { AdvancedLocked } from '@/features/analytics/components/stats/advanced-locked'
import { languageItems } from '@/features/analytics/utils/breakdown-labels'
import { GuestActions } from '@/features/analytics/components/stats/guest-actions'
import { MenuOrders } from '@/features/analytics/components/stats/menu-orders'
import { OrderFunnel } from '@/features/analytics/components/stats/order-funnel'
import { SummaryTiles } from '@/features/analytics/components/stats/summary-tiles'
import { useAdvancedStats, useStatsSummary } from '@/features/analytics/hooks/use-analytics'
import type {
  AdvancedStats,
  StatsRange,
  StatsSummary,
} from '@/features/analytics/schemas/analytics.schema'
import { formatShare } from '@/shared/utils/format/number'

export type AnalyticsPageProps = {
  locale: Locale
  /** Whether the package includes advanced analytics. */
  advanced: boolean
  onOpenPackage: () => void
}

/**
 * How guests find and use the menu. Every package gets the headline numbers
 * and the daily chart; advanced analytics add the rest underneath.
 */
export function AnalyticsPage({ locale, advanced, onOpenPackage }: AnalyticsPageProps) {
  // Today first: what an owner opens the page to see.
  const [range, setRange] = useState<StatsRange>('today')
  const summary = useStatsSummary(range)
  const insights = useAdvancedStats(range, advanced)

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-end justify-end gap-3">
        <RangePicker value={range} onChange={setRange} advanced={advanced} />
      </div>

      {summary.isPending ? (
        <SummarySkeleton />
      ) : summary.isError ? (
        <ErrorState description={summary.error.message} onRetry={() => void summary.refetch()} />
      ) : (
        <Summary
          summary={summary.data}
          today={range === 'today'}
          // The change against the period before is part of advanced analytics.
          previous={advanced ? summary.data.previous : undefined}
          locale={locale}
        />
      )}

      {!advanced ? (
        <AdvancedLocked locale={locale} onOpenPackage={onOpenPackage} />
      ) : insights.isPending ? (
        <Skeleton className="h-[420px]" />
      ) : insights.isError ? (
        <ErrorState description={insights.error.message} onRetry={() => void insights.refetch()} />
      ) : (
        <Advanced insights={insights.data} locale={locale} />
      )}
    </div>
  )
}

function Summary({
  summary,
  today,
  previous,
  locale,
}: {
  summary: StatsSummary
  /** The range is today: the views tile needs no "N today" under it. */
  today: boolean
  previous: StatsSummary['previous'] | undefined
  locale: Locale
}) {
  const { t } = useTranslation('analytics')
  const { totals } = summary
  const links = totals.views - totals.qr_scans

  return (
    <>
      <SummaryTiles
        totals={totals}
        channel={summary.order_channel}
        previous={previous}
        showToday={!today}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <FormSection title={t('visits.title')} description={t('visits.description')}>
          {totals.views === 0 ? (
            <p className="py-6 text-[13px] text-[var(--muted)]">{t('visits.empty')}</p>
          ) : (
            <VisitsChart series={summary.series} locale={locale} />
          )}
        </FormSection>

        <FormSection title={t('arrive.title')}>
          <RankedList
            aria-label={t('arrive.title')}
            empty={t('arrive.empty')}
            items={
              totals.views === 0
                ? []
                : [
                    {
                      id: 'qr',
                      label: t('arrive.qr'),
                      value: totals.qr_scans,
                      detail: formatShare(totals.qr_scans / totals.views),
                    },
                    {
                      id: 'link',
                      label: t('arrive.link'),
                      value: links,
                      detail: formatShare(links / totals.views),
                    },
                  ]
            }
          />
        </FormSection>
      </div>
    </>
  )
}

function Advanced({ insights, locale }: { insights: AdvancedStats; locale: Locale }) {
  const { t } = useTranslation('analytics')

  return (
    <>
      <FormSection title={t('busiest.title')} description={t('busiest.description')}>
        <BusyTimesChart hours={insights.hours} weekdays={insights.weekdays} locale={locale} />
      </FormSection>

      <FormSection title={t('actions.title')} description={t('actions.description')}>
        <GuestActions actions={insights.actions} takesOrders={insights.funnel !== null} />
      </FormSection>

      {/* Only for orders placed in the menu; WhatsApp ordering has no totals. */}
      {insights.menu_orders ? <MenuOrders orders={insights.menu_orders} locale={locale} /> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {insights.funnel ? (
          <FormSection title={t('funnel.title')}>
            <OrderFunnel funnel={insights.funnel} />
          </FormSection>
        ) : null}
        {insights.funnel !== null ? (
          <FormSection title={t('topAdded.title')}>
            <RankedList
              aria-label={t('topAdded.title')}
              empty={t('topAdded.empty')}
              items={insights.top_added.map((dish) => ({
                id: dish.name,
                label: dish.name,
                value: dish.count,
              }))}
            />
          </FormSection>
        ) : null}
        <FormSection title={t('topCategories.title')}>
          <RankedList
            aria-label={t('topCategories.title')}
            empty={t('topCategories.empty')}
            items={insights.top_categories.map((category) => ({
              id: category.name,
              label: category.name,
              value: category.count,
            }))}
          />
        </FormSection>
        <FormSection title={t('searches.title')}>
          <RankedList
            aria-label={t('searches.title')}
            empty={t('searches.empty')}
            items={insights.searches.map((search) => ({
              id: search.term,
              label: search.term,
              value: search.count,
            }))}
          />
        </FormSection>
        <FormSection title={t('missed.title')} description={t('missed.description')}>
          <RankedList
            aria-label={t('missed.title')}
            empty={t('missed.empty')}
            items={insights.missed_searches.map((search) => ({
              id: search.term,
              label: search.term,
              value: search.count,
            }))}
          />
        </FormSection>
        <FormSection title={t('languages.title')} description={t('languages.description')}>
          <RankedList
            aria-label={t('languages.title')}
            empty={t('languages.empty')}
            items={languageItems(insights.languages)}
          />
        </FormSection>
      </div>
    </>
  )
}

function SummarySkeleton() {
  return (
    <>
      <SkeletonList
        count={4}
        className="grid grid-cols-2 gap-2.5 lg:grid-cols-4"
        itemClassName="h-[84px]"
      />
      <Skeleton className="h-[300px]" />
    </>
  )
}
