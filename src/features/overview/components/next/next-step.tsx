import {
  IconArrowRight,
  IconCamera,
  IconCategory,
  IconChevronRight,
  IconCircleCheck,
  IconClock,
  IconFileText,
  IconLink,
  IconMapPin,
  IconPhone,
  IconPhoto,
  IconPhotoCircle,
  IconToolsKitchen2,
  type TablerIcon,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui'
import type {
  ChecklistItem,
  ChecklistTarget,
} from '@/features/overview/components/checklist/menu-checklist-items'

export type NextStepProps = {
  items: ChecklistItem[]
  onOpen: (target: ChecklistTarget) => void
  /** Whether every step is listed below, and the way to show or hide them. */
  stepsShown: boolean
  onToggleSteps: () => void
}

/** Each checklist item's picture, by its id. */
const ICONS: Record<string, TablerIcon> = {
  logo: IconPhotoCircle,
  cover: IconPhoto,
  description: IconFileText,
  hours: IconClock,
  location: IconMapPin,
  phone: IconPhone,
  categories: IconCategory,
  dishes: IconToolsKitchen2,
  photos: IconCamera,
  social: IconLink,
}

/**
 * Setting the menu up, one thing at a time: how far along it is, the next
 * thing missing with why it matters, and one button to go and add it. The
 * whole list is a tap away.
 */
export function NextStep({ items, onOpen, stepsShown, onToggleSteps }: NextStepProps) {
  const { t, i18n } = useTranslation('overview')
  const done = items.filter((item) => item.done).length
  const next = items.find((item) => !item.done)
  if (!next) return null

  // "Add" + "A cover photo" reads "Add a cover photo".
  const lower = next.label.charAt(0).toLocaleLowerCase(i18n.language) + next.label.slice(1)
  const Icon = ICONS[next.id] ?? IconCircleCheck

  return (
    <section
      aria-labelledby="setup-title"
      className="flex flex-col gap-4 glass-card rounded-[22px] p-4 sm:p-5"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-wash text-accent"
        >
          <IconCircleCheck className="size-[22px]" stroke={1.6} />
        </span>
        <h3 id="setup-title" className="min-w-0 flex-1 text-[22px] leading-tight">
          {t('setup.title')}
        </h3>
        <span className="shrink-0 text-[13px] text-[var(--muted)] tabular-nums">
          {t('setup.progress', { done, total: items.length })}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={t('setup.progressLabel')}
        aria-valuemin={0}
        aria-valuemax={items.length}
        aria-valuenow={done}
        className="h-2 overflow-hidden rounded-full bg-[var(--hover-wash)]"
      >
        <div
          className="h-full rounded-full bg-gold transition-[width] duration-500"
          style={{ width: `${(done / items.length) * 100}%` }}
        />
      </div>
      <button
        type="button"
        onClick={() => onOpen(next.action.target)}
        className="flex items-center gap-3 rounded-[16px] border-[0.5px] border-[var(--line)] bg-[var(--hover-wash)] p-3 text-start transition-colors hover:bg-[var(--hover-wash)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-on)]"
      >
        <span
          aria-hidden
          className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-wash text-accent"
        >
          <Icon className="size-5" stroke={1.7} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">
            {t('next.title', { item: next.label })}
          </span>
          <span className="mt-0.5 block text-[13px] leading-snug text-[var(--muted)]">
            {next.hint}
          </span>
        </span>
        <IconChevronRight
          aria-hidden
          className="size-4 shrink-0 text-[var(--faint)] rtl:rotate-180"
        />
      </button>
      <Button variant="primary" block className="h-12" onClick={() => onOpen(next.action.target)}>
        {t('next.cta', { action: next.action.label, item: lower })}
      </Button>
      <Button
        variant="link"
        size="sm"
        className="-mt-1 gap-1.5 self-center"
        onClick={onToggleSteps}
      >
        {stepsShown ? t('next.hideSteps') : t('next.showSteps')}
        <IconArrowRight aria-hidden className="size-4 rtl:rotate-180" />
      </Button>
    </section>
  )
}
