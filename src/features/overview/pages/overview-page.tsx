import { IconChevronRight } from '@tabler/icons-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSession, type AuthRestaurant } from '@/features/auth'
import { useDishes } from '@/features/menu'
import { useRestaurant } from '@/features/restaurant'
import { ErrorState, Skeleton } from '@/shared/components/feedback'
import { ContentCounts } from '@/features/overview/components/counts/content-counts'
import { SetupStepper } from '@/features/overview/components/checklist/setup-stepper'
import { HowItWorks } from '@/features/overview/components/guide/how-it-works'
import { MenuLinkCard } from '@/features/overview/components/link/menu-link-card'
import { NextStep } from '@/features/overview/components/next/next-step'
import { TodayNumbers } from '@/features/overview/components/today/today-numbers'
import { menuChecklist } from '@/features/overview/utils/menu-checklist-items'

export type OverviewPageProps = {
  limits: AuthRestaurant['limits']
  /** Sections the owner switched off; their checklist items are left out. */
  switchedOff: readonly string[]
  /** Opens a dashboard section: a step's, the orders, the analytics, the QR code. */
  onOpen: (key: string) => void
  /** Orders waiting to be accepted, by page (the order pulse's counts). */
  ordersWaiting?: { orders: number; tables: number }
  /** Today's numbers need the analytics the package gives and the owner left on. */
  showToday?: boolean
}

const NONE_WAITING = { orders: 0, tables: 0 }

/**
 * Home, under the greeting in the topbar: the menu's link to share first,
 * the orders waiting, today's numbers, then only the next thing to set up
 * (the whole list a tap away), then what is on the menu against what the
 * package allows, each a tap from its page.
 */
export function OverviewPage({
  limits,
  switchedOff,
  onOpen,
  ordersWaiting = NONE_WAITING,
  showToday = false,
}: OverviewPageProps) {
  const { t } = useTranslation('overview')
  const settings = useRestaurant()
  const dishes = useDishes()
  const publicUrl = useSession().data?.restaurant?.public_url ?? null
  const [stepsShown, setStepsShown] = useState(false)
  const waiting = ordersWaiting.orders + ordersWaiting.tables

  return (
    <div className="flex flex-1 flex-col gap-5">
      {publicUrl ? <MenuLinkCard publicUrl={publicUrl} onOpenQr={() => onOpen('qr')} /> : null}

      {waiting > 0 ? (
        <button
          type="button"
          onClick={() => onOpen(ordersWaiting.orders > 0 ? 'orders' : 'table-orders')}
          className="flex items-center gap-3 rounded-card bg-[var(--status-warn-wash)] px-4 py-3.5 text-start font-semibold text-[var(--status-warn)] focus-ring"
        >
          <span aria-hidden className="size-2.5 rounded-full bg-current" />
          <span className="flex-1">{t('waiting', { count: waiting })}</span>
          <IconChevronRight aria-hidden className="size-4 rtl:rotate-180" />
        </button>
      ) : null}

      {showToday ? <TodayNumbers onOpen={() => onOpen('analytics')} /> : null}

      {settings.isPending || dishes.isPending ? (
        <Skeleton className="h-[220px]" />
      ) : settings.isError || dishes.isError ? (
        <ErrorState
          description={(settings.error ?? dishes.error)?.message}
          onRetry={() => {
            if (settings.isError) void settings.refetch()
            if (dishes.isError) void dishes.refetch()
          }}
        />
      ) : (
        <SetUp
          items={menuChecklist({
            settings: settings.data,
            dishes: dishes.data.data,
            limits,
          }).filter((item) => !switchedOff.includes(item.action.target))}
          stepsShown={stepsShown}
          onToggleSteps={() => setStepsShown((shown) => !shown)}
          onOpen={onOpen}
        />
      )}

      <ContentCounts limits={limits} onOpen={onOpen} />
    </div>
  )
}

/** The next step, and every step with how Qayema works once asked for; nothing once all are done. */
function SetUp({
  items,
  stepsShown,
  onToggleSteps,
  onOpen,
}: {
  items: Parameters<typeof SetupStepper>[0]['items']
  stepsShown: boolean
  onToggleSteps: () => void
  onOpen: (key: string) => void
}) {
  if (items.every((item) => item.done)) return null

  return (
    <>
      <NextStep
        items={items}
        onOpen={onOpen}
        stepsShown={stepsShown}
        onToggleSteps={onToggleSteps}
      />
      {stepsShown ? (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <SetupStepper items={items} onOpen={onOpen} />
          <HowItWorks />
        </div>
      ) : null}
    </>
  )
}
