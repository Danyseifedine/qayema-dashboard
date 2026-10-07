import { useTranslation } from 'react-i18next'
import { useSession, type AuthRestaurant } from '@/features/auth'
import { useDishes } from '@/features/menu'
import { useRestaurant } from '@/features/restaurant'
import { ErrorState } from '@/shared/components/feedback'
import { ContentCounts } from '@/features/overview/components/counts/content-counts'
import { SetupStepper } from '@/features/overview/components/checklist/setup-stepper'
import { HowItWorks } from '@/features/overview/components/guide/how-it-works'
import { MenuLinkCard } from '@/features/overview/components/link/menu-link-card'
import {
  menuChecklist,
  type ChecklistTarget,
} from '@/features/overview/components/checklist/menu-checklist-items'

export type OverviewPageProps = {
  limits: AuthRestaurant['limits']
  /** Sections the owner switched off; their checklist items are left out. */
  switchedOff: readonly string[]
  /** Opens the dashboard section a step points to (the QR code page too). */
  onOpen: (target: ChecklistTarget) => void
}

/**
 * The menu at a glance: its link first (what to share), then setting it up
 * step by step beside a short guide to how Qayema works, then what is on it
 * against what the package allows.
 */
export function OverviewPage({ limits, switchedOff, onOpen }: OverviewPageProps) {
  const { t } = useTranslation('overview')
  const settings = useRestaurant()
  const dishes = useDishes()
  const publicUrl = useSession().data?.restaurant?.public_url ?? null

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h2 className="font-display text-[19px] leading-tight">{t('page.title')}</h2>
        <p className="mt-1 text-[13px] leading-snug text-[var(--muted)]">{t('page.description')}</p>
      </div>

      {publicUrl ? <MenuLinkCard publicUrl={publicUrl} onOpenQr={() => onOpen('qr')} /> : null}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {settings.isPending || dishes.isPending ? (
          <div className="h-[420px] animate-pulse rounded-[14px] bg-[var(--hover-wash)]" />
        ) : settings.isError || dishes.isError ? (
          <ErrorState
            description={(settings.error ?? dishes.error)?.message}
            onRetry={() => {
              if (settings.isError) void settings.refetch()
              if (dishes.isError) void dishes.refetch()
            }}
          />
        ) : (
          <SetupStepper
            items={menuChecklist({
              settings: settings.data,
              dishes: dishes.data.data,
              limits,
            }).filter((item) => !switchedOff.includes(item.action.target))}
            onOpen={onOpen}
          />
        )}
        <HowItWorks />
      </div>

      <ContentCounts limits={limits} />
    </div>
  )
}
