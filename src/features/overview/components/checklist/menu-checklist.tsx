import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { FormSection } from '@/shared/components/forms'
import { Button } from '@/shared/components/ui'
import { cn } from '@/shared/utils/dom/cn'
import type {
  ChecklistItem,
  ChecklistTarget,
} from '@/features/overview/components/checklist/menu-checklist-items'

export type MenuChecklistProps = {
  items: ChecklistItem[]
  onOpen: (target: ChecklistTarget) => void
}

/** What is still missing from the menu, each with a way to go and fix it. */
export function MenuChecklist({ items, onOpen }: MenuChecklistProps) {
  const { t } = useTranslation('overview')
  const done = items.filter((item) => item.done).length
  const complete = done === items.length
  // What is left goes first, so its buttons are in view without scrolling.
  const ordered = [...items.filter((item) => !item.done), ...items.filter((item) => item.done)]

  return (
    <FormSection
      title={t('checklist.title')}
      description={complete ? t('checklist.complete') : t('checklist.incomplete')}
    >
      <div className="flex items-center gap-3 pt-1 pb-1">
        <div
          role="progressbar"
          aria-label={t('checklist.progressLabel')}
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
          {t('checklist.progress', { done, total: items.length })}
        </span>
      </div>

      <ul
        className="flex flex-col divide-y-[0.5px] divide-[var(--line-2)]"
        aria-label={t('checklist.listLabel')}
      >
        {ordered.map((item) => (
          <li key={item.id} className="flex items-center gap-3 py-2.5">
            <span
              aria-hidden
              className={cn(
                'grid size-6 shrink-0 place-items-center rounded-full',
                item.done
                  ? 'bg-[var(--status-success)] text-white'
                  : 'border-[1.5px] border-[var(--line-strong)]',
              )}
            >
              {item.done ? <Check className="size-3.5" strokeWidth={3} /> : null}
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
        ))}
      </ul>
    </FormSection>
  )
}
