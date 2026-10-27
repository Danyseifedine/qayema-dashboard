import { useTranslation } from 'react-i18next'
import { StepCircle } from '@/shared/components/ui/step-circle'
import { cn } from '@/shared/utils/dom/cn'

export type StepperProps = {
  /** What the row of steps is, for a screen reader ("Offer steps"). */
  label: string
  /** Each step's id and name, in order. */
  steps: readonly { id: string; name: string }[]
  current: number
  /** The furthest step reached: it and those before it can be opened. */
  reached: number
  onGo: (step: number) => void
}

/**
 * An editor's steps (an offer's, a build's) in a row of numbered circles
 * joined by lines, a tick on each one passed. Wide, each is named; on a
 * phone the circles stay and the open step's name is written under them.
 */
export function Stepper({ label, steps, current, reached, onGo }: StepperProps) {
  const { t } = useTranslation()
  const last = steps.length - 1

  return (
    <nav aria-label={label} className="flex flex-col gap-2">
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const done = index < reached && index !== current
          const open = index === current
          return (
            <li key={step.id} className={cn('flex items-center', index < last && 'flex-1')}>
              <button
                type="button"
                disabled={index > reached}
                aria-current={open ? 'step' : undefined}
                aria-label={t(done ? 'stepper.stepDone' : 'stepper.step', {
                  number: index + 1,
                  name: step.name,
                })}
                onClick={() => onGo(index)}
                className="flex shrink-0 items-center gap-2 rounded-full focus-ring disabled:cursor-default"
              >
                <StepCircle
                  number={index + 1}
                  state={open ? 'open' : done ? 'done' : index <= reached ? 'current' : 'ahead'}
                />
                <span
                  aria-hidden
                  className={cn(
                    'hidden text-[13px] whitespace-nowrap md:inline',
                    open ? 'font-medium text-[var(--text)]' : 'text-[var(--muted)]',
                  )}
                >
                  {step.name}
                </span>
              </button>
              {index < last ? (
                <span
                  aria-hidden
                  className={cn(
                    'mx-2 h-px min-w-3 flex-1',
                    index < reached ? 'bg-status-success' : 'bg-[var(--line-strong)]',
                  )}
                />
              ) : null}
            </li>
          )
        })}
      </ol>
      <p aria-hidden className="text-[12.5px] text-[var(--muted)] md:hidden">
        {t('stepper.progress', {
          number: current + 1,
          total: steps.length,
          name: steps[current]!.name,
        })}
      </p>
    </nav>
  )
}
