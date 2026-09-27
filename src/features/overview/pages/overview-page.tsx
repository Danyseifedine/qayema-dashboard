import { useTranslation } from 'react-i18next'
import type { AuthRestaurant } from '@/features/auth'
import { useDishes } from '@/features/menu'
import { useRestaurant } from '@/features/restaurant'
import { ErrorState } from '@/shared/components/feedback'
import { ContentCounts } from '@/features/overview/components/counts/content-counts'
import { MenuChecklist } from '@/features/overview/components/checklist/menu-checklist'
import {
  menuChecklist,
  type ChecklistTarget,
} from '@/features/overview/components/checklist/menu-checklist-items'

export type OverviewPageProps = {
  limits: AuthRestaurant['limits']
  /** Sections the owner switched off; their checklist items are left out. */
  switchedOff?: readonly string[]
  /** Opens the dashboard section a checklist item points to. */
  onOpen: (target: ChecklistTarget) => void
}

/**
 * The menu at a glance: what is on it against what the package allows, and
 * what is still missing.
 */
/** Stable empty default, so the prop keeps its identity between renders. */
const NONE: readonly string[] = []

export function OverviewPage({ limits, switchedOff = NONE, onOpen }: OverviewPageProps) {
  const { t } = useTranslation('overview')
  const settings = useRestaurant()
  const dishes = useDishes()

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h2 className="font-display text-[19px] leading-tight">{t('page.title')}</h2>
        <p className="mt-1 text-[13px] leading-snug text-[var(--muted)]">{t('page.description')}</p>
      </div>

      <ContentCounts limits={limits} />

      {settings.isPending || dishes.isPending ? (
        <div className="h-[520px] animate-pulse rounded-[14px] bg-[var(--hover-wash)]" />
      ) : settings.isError || dishes.isError ? (
        <ErrorState
          description={(settings.error ?? dishes.error)?.message}
          onRetry={() => {
            if (settings.isError) void settings.refetch()
            if (dishes.isError) void dishes.refetch()
          }}
        />
      ) : (
        <MenuChecklist
          items={menuChecklist({
            settings: settings.data,
            dishes: dishes.data.data,
            limits,
          }).filter((item) => !switchedOff.includes(item.action.target))}
          onOpen={onOpen}
        />
      )}
    </div>
  )
}
