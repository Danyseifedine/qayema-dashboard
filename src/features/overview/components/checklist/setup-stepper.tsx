import { IconCheck, IconChevronDown, IconQrcode } from '@tabler/icons-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FormSection } from '@/shared/components/forms'
import { Button } from '@/shared/components/ui'
import { cn } from '@/shared/utils/dom/cn'
import {
  setupSteps,
  type ChecklistItem,
  type ChecklistTarget,
  type SetupStepId,
} from '@/features/overview/components/checklist/menu-checklist-items'

export type SetupStepperProps = {
  items: ChecklistItem[]
  onOpen: (target: ChecklistTarget) => void
}

/**
 * Setting up the menu in three numbered steps (your restaurant, your dishes,
 * sharing it), each with what is still missing and a button to go and add
 * it. The first step not yet done is open; the others open on a tap.
 */
export function SetupStepper({ items, onOpen }: SetupStepperProps) {
  const { t } = useTranslation('overview')
  const steps = setupSteps(items)
  const done = items.filter((item) => item.done).length
  const current = steps.find((step) => !step.done)?.id ?? null
  const [open, setOpen] = useState<SetupStepId | null>(current)

  return (
    <FormSection
      title={t('setup.title')}
      description={current === null ? t('setup.complete') : t('setup.incomplete')}
    >
      <div className="flex items-center gap-3 pt-1 pb-2">
        <div
          role="progressbar"
          aria-label={t('setup.progressLabel')}
          aria-valuemin={0}
          aria-valuemax={items.length}
          aria-valuenow={done}
          className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--hover-wash)]"
        >
          <div
            className="h-full rounded-full bg-[var(--status-success)] transition-[width] duration-500"
            style={{ width: `${(done / items.length) * 100}%` }}
          />
        </div>
        <span className="shrink-0 text-[12.5px] text-[var(--muted)] tabular-nums">
          {t('setup.progress', { done, total: items.length })}
        </span>
      </div>

      <ol className="flex flex-col">
        {steps.map((step, index) => {
          const expanded = open === step.id
          const left = step.items.filter((item) => !item.done)
          const last = index === steps.length - 1

          return (
            <li key={step.id} className="relative flex gap-3">
              {/* The line joining one step's circle to the next. */}
              {last ? null : (
                <span
                  aria-hidden
                  className="absolute start-[13px] top-8 bottom-0 w-px bg-[var(--line-strong)]"
                />
              )}
              <span
                aria-hidden
                className={cn(
                  'relative z-[1] grid size-[27px] shrink-0 place-items-center rounded-full text-[12.5px] font-semibold',
                  step.done
                    ? 'bg-[var(--status-success)] text-white'
                    : step.id === current
                      ? 'bg-accent-wash text-accent ring-1 ring-[var(--gold-on)]'
                      : 'border-[1.5px] border-[var(--line-strong)] bg-[var(--surface)] text-[var(--muted)]',
                )}
              >
                {step.done ? <IconCheck className="size-3.5" stroke={3} /> : index + 1}
              </span>

              <div className={cn('min-w-0 flex-1', last ? 'pb-1' : 'pb-5')}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : step.id)}
                  className={cn(
                    'flex w-full items-start justify-between gap-3 rounded-md text-start',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-on)]',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block text-[14px] font-medium text-[var(--text)]">
                      {t(`setup.steps.${step.id}.title`)}
                    </span>
                    <span className="block text-[12.5px] leading-snug text-[var(--muted)]">
                      {step.done
                        ? t('setup.stepDone')
                        : t('setup.stepLeft', { count: left.length })}
                    </span>
                  </span>
                  <IconChevronDown
                    aria-hidden
                    className={cn(
                      'mt-0.5 size-4 shrink-0 text-[var(--muted)] transition-transform',
                      expanded && 'rotate-180',
                    )}
                  />
                </button>

                {expanded ? (
                  <div className="mt-2 flex flex-col gap-2">
                    <p className="text-[12.5px] leading-snug text-[var(--muted)]">
                      {t(`setup.steps.${step.id}.description`)}
                    </p>
                    <ul
                      className="flex flex-col divide-y-[0.5px] divide-[var(--line-2)] rounded-[10px] border-[0.5px] border-[var(--line)] px-3"
                      aria-label={t(`setup.steps.${step.id}.title`)}
                    >
                      {[...left, ...step.items.filter((item) => item.done)].map((item) => (
                        <ChecklistRow key={item.id} item={item} onOpen={onOpen} />
                      ))}
                    </ul>
                    {step.id === 'share' ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="self-start"
                        leadingIcon={<IconQrcode aria-hidden className="size-4" />}
                        onClick={() => onOpen('qr')}
                      >
                        {t('setup.getQr')}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
    </FormSection>
  )
}

function ChecklistRow({
  item,
  onOpen,
}: {
  item: ChecklistItem
  onOpen: (target: ChecklistTarget) => void
}) {
  const { t } = useTranslation('overview')

  return (
    <li className="flex items-center gap-3 py-2.5">
      <span
        aria-hidden
        className={cn(
          'grid size-5 shrink-0 place-items-center rounded-full',
          item.done
            ? 'bg-[var(--status-success)] text-white'
            : 'border-[1.5px] border-[var(--line-strong)]',
        )}
      >
        {item.done ? <IconCheck className="size-3" stroke={3} /> : null}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-[13.5px]',
            item.done ? 'text-[var(--muted)]' : 'font-medium text-[var(--text)]',
          )}
        >
          {item.label}
          <span className="sr-only">
            {` ${item.done ? t('checklist.stateDone') : t('checklist.stateToDo')}`}
          </span>
        </p>
        {item.done ? null : (
          <p className="text-[12.5px] leading-snug text-[var(--muted)]">{item.hint}</p>
        )}
      </div>
      {item.done ? null : (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onOpen(item.action.target)}
          aria-label={t('checklist.actionLabel', {
            action: item.action.label,
            item: item.label,
          })}
        >
          {item.action.label}
        </Button>
      )}
    </li>
  )
}
