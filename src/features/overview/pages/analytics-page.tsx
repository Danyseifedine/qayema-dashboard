import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ErrorState } from '@/shared/components/feedback'
import { FormSection } from '@/shared/components/forms'
import type { Locale } from '@/shared/constants/locales'
import { BusyTimesChart } from '../components/charts/busy-times-chart'
import { RankedList } from '../components/charts/ranked-list'
import { VisitsChart } from '../components/charts/visits-chart'
import { RangePicker } from '../components/range/range-picker'
import { AdvancedLocked } from '../components/stats/advanced-locked'
import { languageItems } from '../components/stats/breakdown-labels'
import { GuestActions } from '../components/stats/guest-actions'
import { OrderFunnel } from '../components/stats/order-funnel'
import { SummaryTiles } from '../components/stats/summary-tiles'
import { useAdvancedStats, useStatsSummary } from '../hooks/use-stats'
import type { AdvancedStats, StatsRange, StatsSummary } from '../schemas/stats.schema'

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
  const { t } = useTranslation('overview')
  const [range, setRange] = useState<StatsRange>('30d')
  const summary = useStatsSummary(range)
  const insights = useAdvancedStats(range, advanced)

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[19px] leading-tight">{t('analytics.title')}</h2>
          <p className="mt-1 text-[13px] leading-snug text-[var(--muted)]">
            {t('analytics.description')}
          </p>
        </div>
        <RangePicker value={range} onChange={setRange} advanced={advanced} />
      </div>

      {summary.isPending ? (
        <SummarySkeleton />
      ) : summary.isError ? (
        <ErrorState description={summary.error.message} onRetry={() => void summary.refetch()} />
      ) : (
        <Summary
          summary={summary.data}
          previous={advanced ? insights.data?.previous : undefined}
          locale={locale}
        />
      )}

      {!advanced ? (
        <AdvancedLocked onOpenPackage={onOpenPackage} />
      ) : insights.isPending ? (
        <div className="h-[420px] animate-pulse rounded-[14px] bg-[var(--hover-wash)]" />
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
  previous,
  locale,
}: {
  summary: StatsSummary
  previous: AdvancedStats['previous'] | undefined
  locale: Locale
}) {
  const { t } = useTranslation('overview')
  const { totals } = summary
  const links = totals.views - totals.qr_scans

  return (
    <>
      <SummaryTiles totals={totals} previous={previous} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <FormSection
          title={t('analytics.visits.title')}
          description={t('analytics.visits.description')}
        >
          {totals.views === 0 ? (
            <p className="py-6 text-[13px] text-[var(--muted)]">{t('analytics.visits.empty')}</p>
          ) : (
            <VisitsChart series={summary.series} locale={locale} />
          )}
        </FormSection>

        <FormSection title={t('analytics.arrive.title')}>
          <RankedList
            aria-label={t('analytics.arrive.title')}
            empty={t('analytics.arrive.empty')}
            items={
              totals.views === 0
                ? []
                : [
                    {
                      id: 'qr',
                      label: t('analytics.arrive.qr'),
                      value: totals.qr_scans,
                      detail: `${Math.round((totals.qr_scans / totals.views) * 100)}%`,
                    },
                    {
                      id: 'link',
                      label: t('analytics.arrive.link'),
                      value: links,
                      detail: `${Math.round((links / totals.views) * 100)}%`,
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
  const { t } = useTranslation('overview')

  return (
    <>
      <FormSection
        title={t('analytics.busiest.title')}
        description={t('analytics.busiest.description')}
      >
        <BusyTimesChart hours={insights.hours} weekdays={insights.weekdays} locale={locale} />
      </FormSection>

      <FormSection
        title={t('analytics.actions.title')}
        description={t('analytics.actions.description')}
      >
        <GuestActions actions={insights.actions} takesOrders={insights.funnel !== null} />
      </FormSection>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {insights.funnel ? (
          <FormSection title={t('analytics.funnel.title')}>
            <OrderFunnel funnel={insights.funnel} />
          </FormSection>
        ) : null}
        {insights.funnel !== null ? (
          <FormSection title={t('analytics.topAdded.title')}>
            <RankedList
              aria-label={t('analytics.topAdded.title')}
              empty={t('analytics.topAdded.empty')}
              items={insights.top_added.map((dish) => ({
                id: dish.name,
                label: dish.name,
                value: dish.count,
              }))}
            />
          </FormSection>
        ) : null}
        <FormSection title={t('analytics.topCategories.title')}>
          <RankedList
            aria-label={t('analytics.topCategories.title')}
            empty={t('analytics.topCategories.empty')}
            items={insights.top_categories.map((category) => ({
              id: category.name,
              label: category.name,
              value: category.count,
            }))}
          />
        </FormSection>
        <FormSection title={t('analytics.searches.title')}>
          <RankedList
            aria-label={t('analytics.searches.title')}
            empty={t('analytics.searches.empty')}
            items={insights.searches.map((search) => ({
              id: search.term,
              label: search.term,
              value: search.count,
            }))}
          />
        </FormSection>
        <FormSection
          title={t('analytics.missed.title')}
          description={t('analytics.missed.description')}
        >
          <RankedList
            aria-label={t('analytics.missed.title')}
            empty={t('analytics.missed.empty')}
            items={insights.missed_searches.map((search) => ({
              id: search.term,
              label: search.term,
              value: search.count,
            }))}
          />
        </FormSection>
        <FormSection
          title={t('analytics.languages.title')}
          description={t('analytics.languages.description')}
        >
          <RankedList
            aria-label={t('analytics.languages.title')}
            empty={t('analytics.languages.empty')}
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
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-[84px] animate-pulse rounded-[12px] bg-[var(--hover-wash)]"
          />
        ))}
      </div>
      <div className="h-[300px] animate-pulse rounded-[14px] bg-[var(--hover-wash)]" />
    </>
  )
}
