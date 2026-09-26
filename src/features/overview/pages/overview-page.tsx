import { useState } from 'react'
import { ErrorState } from '@/shared/components/feedback'
import { FormSection } from '@/shared/components/forms'
import type { Locale } from '@/shared/constants/locales'
import { BusyTimesChart } from '../components/charts/busy-times-chart'
import { RankedList } from '../components/charts/ranked-list'
import { VisitsChart } from '../components/charts/visits-chart'
import { RangePicker } from '../components/range/range-picker'
import { AdvancedLocked } from '../components/stats/advanced-locked'
import { breakdownItems } from '../components/stats/breakdown-labels'
import { GuestActions } from '../components/stats/guest-actions'
import { OrderFunnel } from '../components/stats/order-funnel'
import { OrdersSummary } from '../components/stats/orders-summary'
import { SummaryTiles } from '../components/stats/summary-tiles'
import { useAdvancedStats, useStatsSummary } from '../hooks/use-stats'
import type { AdvancedStats, StatsRange, StatsSummary } from '../schemas/stats.schema'

export type OverviewPageProps = {
  locale: Locale
  /** Whether the package includes advanced analytics. */
  advanced: boolean
  onOpenPackage: () => void
}

/**
 * How guests find and use the menu. Every package gets the headline numbers
 * and the daily chart; advanced analytics add the rest underneath.
 */
export function OverviewPage({ locale, advanced, onOpenPackage }: OverviewPageProps) {
  const [range, setRange] = useState<StatsRange>('30d')
  const summary = useStatsSummary(range)
  const insights = useAdvancedStats(range, advanced)

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[19px] leading-tight">Overview</h2>
          <p className="mt-1 text-[13px] leading-snug text-[var(--muted)]">
            How guests find your menu and what they do on it.
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
  const { totals } = summary
  const links = totals.views - totals.qr_scans

  return (
    <>
      <SummaryTiles totals={totals} previous={previous} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <FormSection title="Visits" description="Each time your menu was opened.">
          {totals.views === 0 ? (
            <p className="py-6 text-[13px] text-[var(--muted)]">
              No visits in this range yet. Share your menu link, or put the QR code on your tables.
            </p>
          ) : (
            <VisitsChart series={summary.series} locale={locale} />
          )}
        </FormSection>

        <FormSection title="How guests arrive">
          <RankedList
            aria-label="How guests arrive"
            empty="No visits in this range yet."
            items={
              totals.views === 0
                ? []
                : [
                    {
                      id: 'qr',
                      label: 'Scanned the QR code',
                      value: totals.qr_scans,
                      detail: `${Math.round((totals.qr_scans / totals.views) * 100)}%`,
                    },
                    {
                      id: 'link',
                      label: 'Opened a link',
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
  return (
    <>
      <FormSection
        title="Busiest times"
        description="When guests open your menu, in your restaurant's time."
      >
        <BusyTimesChart hours={insights.hours} weekdays={insights.weekdays} locale={locale} />
      </FormSection>

      <FormSection title="What guests do" description="Taps and searches once the menu is open.">
        <GuestActions actions={insights.actions} takesOrders={insights.orders !== null} />
      </FormSection>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {insights.funnel ? (
          <FormSection title="From visit to order">
            <OrderFunnel funnel={insights.funnel} />
          </FormSection>
        ) : null}
        {insights.orders !== null ? (
          <FormSection title="Most added to the cart">
            <RankedList
              aria-label="Most added to the cart"
              empty="Nothing added to a cart in this range."
              items={insights.top_added.map((dish) => ({
                id: dish.name,
                label: dish.name,
                value: dish.count,
              }))}
            />
          </FormSection>
        ) : null}
        <FormSection title="Most opened categories">
          <RankedList
            aria-label="Most opened categories"
            empty="No category picked in this range."
            items={insights.top_categories.map((category) => ({
              id: category.name,
              label: category.name,
              value: category.count,
            }))}
          />
        </FormSection>
        <FormSection title="What guests search for">
          <RankedList
            aria-label="What guests search for"
            empty="No searches in this range."
            items={insights.searches.map((search) => ({
              id: search.term,
              label: search.term,
              value: search.count,
            }))}
          />
        </FormSection>
        <FormSection
          title="Searched but not found"
          description="Guests looked for these and your menu had nothing to show."
        >
          <RankedList
            aria-label="Searched but not found"
            empty="Every search found something."
            items={insights.missed_searches.map((search) => ({
              id: search.term,
              label: search.term,
              value: search.count,
            }))}
          />
        </FormSection>
      </div>

      {insights.orders ? (
        <FormSection title="Orders" description="Cancelled orders are not counted in the money.">
          <OrdersSummary orders={insights.orders} locale={locale} />
        </FormSection>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FormSection title="Devices">
          <RankedList
            aria-label="Devices"
            empty="No visits in this range."
            items={breakdownItems(insights.devices, 'device')}
          />
        </FormSection>
        <FormSection title="Languages">
          <RankedList
            aria-label="Languages"
            empty="No visits in this range."
            items={breakdownItems(insights.languages, 'language')}
          />
        </FormSection>
        <FormSection title="Browsers">
          <RankedList
            aria-label="Browsers"
            empty="No visits in this range."
            items={breakdownItems(insights.browsers, 'plain')}
          />
        </FormSection>
        <FormSection title="Systems">
          <RankedList
            aria-label="Systems"
            empty="No visits in this range."
            items={breakdownItems(insights.systems, 'plain')}
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
