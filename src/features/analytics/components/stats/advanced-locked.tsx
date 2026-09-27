import { ChartNoAxesColumn, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui'

const INCLUDES = ['compare', 'busiest', 'taps', 'searches', 'funnel'] as const

export type AdvancedLockedProps = {
  onOpenPackage: () => void
}

/** Where the advanced analytics would be, on a package without them. */
export function AdvancedLocked({ onOpenPackage }: AdvancedLockedProps) {
  const { t } = useTranslation('analytics')

  return (
    <section className="flex flex-col gap-4 rounded-[14px] border-[0.5px] border-[var(--accent-border)] bg-[var(--accent-wash)] p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[var(--surface)] text-accent">
          <ChartNoAxesColumn aria-hidden className="size-5" />
        </span>
        <div>
          <h3 className="flex items-center gap-1.5 text-[15px] font-semibold">
            {t('locked.title')}
            <Lock aria-hidden className="size-3.5 text-[var(--muted)]" />
          </h3>
          <p className="mt-0.5 text-[13px] leading-snug text-[var(--muted)]">
            {t('locked.description')}
          </p>
        </div>
      </div>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-2">
        {INCLUDES.map((line) => (
          <li key={line} className="flex gap-2">
            <span aria-hidden className="text-accent">
              •
            </span>
            {t(`locked.includes.${line}`)}
          </li>
        ))}
      </ul>
      <Button className="self-start" onClick={onOpenPackage}>
        {t('locked.cta')}
      </Button>
    </section>
  )
}
