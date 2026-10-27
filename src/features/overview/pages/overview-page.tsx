import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Collapse } from '@/shared/components/ui'
import { useSession, type AuthRestaurant } from '@/features/auth'
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
 * package allows and the AI credits left, each a tap from its page.
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
  const restaurant = useSession().data?.restaurant
  const publicUrl = restaurant?.public_url ?? null
  const [stepsShown, setStepsShown] = useState(false)
  const waiting = ordersWaiting.orders + ordersWaiting.tables

  return (
    <div className="flex flex-1 flex-col gap-5">
      {publicUrl ? <MenuLinkCard publicUrl={publicUrl} onOpenQr={() => onOpen('qr')} /> : null}

      {waiting > 0 ? (
        <Alert
          variant="warning"
          onClick={() => onOpen(ordersWaiting.orders > 0 ? 'orders' : 'table-orders')}
        >
          {t('waiting', { count: waiting })}
        </Alert>
      ) : null}

      {showToday ? <TodayNumbers onOpen={() => onOpen('analytics')} /> : null}

      {settings.isPending ? (
        <Skeleton className="h-[220px]" />
      ) : settings.isError ? (
        <ErrorState description={settings.error.message} onRetry={() => void settings.refetch()} />
      ) : (
        <SetUp
          items={menuChecklist({
            settings: settings.data,
            limits,
            withoutPhoto: restaurant?.dishes_without_photo ?? 0,
          }).filter((item) => !switchedOff.includes(item.action.target))}
          stepsShown={stepsShown}
          onToggleSteps={() => setStepsShown((shown) => !shown)}
          onOpen={onOpen}
        />
      )}

      <ContentCounts
        limits={limits}
        credits={restaurant?.writing_help?.credits ?? null}
        onOpen={onOpen}
      />
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

  // One block, so the steps sliding shut leave no gap behind them.
  return (
    <div className="flex flex-col">
      <NextStep
        items={items}
        onOpen={onOpen}
        stepsShown={stepsShown}
        onToggleSteps={onToggleSteps}
      />
      <Collapse
        open={stepsShown}
        className="grid items-start gap-4 pt-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"
      >
        <SetupStepper items={items} onOpen={onOpen} />
        <HowItWorks />
      </Collapse>
    </div>
  )
}
