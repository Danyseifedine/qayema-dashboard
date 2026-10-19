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
import type { ChecklistItem, ChecklistTarget } from '@/features/overview/utils/menu-checklist-items'

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
      className="flex flex-col gap-3 glass-card rounded-card p-3.5 sm:gap-4 sm:p-5"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-wash text-accent sm:size-11"
        >
          <IconCircleCheck className="size-[18px] sm:size-[22px]" stroke={1.6} />
        </span>
        <h3 id="setup-title" className="min-w-0 flex-1 text-[18px] leading-tight sm:text-[22px]">
          {t('setup.title')}
        </h3>
        <span className="shrink-0 text-[12px] text-[var(--muted)] tabular-nums sm:text-[13px]">
          {t('setup.progress', { done, total: items.length })}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={t('setup.progressLabel')}
        aria-valuemin={0}
        aria-valuemax={items.length}
        aria-valuenow={done}
        className="h-1.5 overflow-hidden rounded-full bg-[var(--hover-wash)] sm:h-2"
      >
        <div
          className="h-full rounded-full bg-gold transition-[width] duration-500"
          style={{ width: `${(done / items.length) * 100}%` }}
        />
      </div>
      <button
        type="button"
        onClick={() => onOpen(next.action.target)}
        className="flex items-center gap-3 rounded-tile border-[0.5px] border-[var(--line)] bg-[var(--hover-wash)] p-2.5 text-start sm:p-3 focus-ring"
      >
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-wash text-accent sm:size-11"
        >
          <Icon className="size-[18px] sm:size-5" stroke={1.7} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-semibold sm:text-[15px]">
            {t('next.title', { item: next.label })}
          </span>
          <span className="mt-0.5 block text-[12px] leading-snug text-[var(--muted)] sm:text-[13px]">
            {next.hint}
          </span>
        </span>
        <IconChevronRight
          aria-hidden
          className="size-4 shrink-0 text-[var(--faint)] rtl:rotate-180"
        />
      </button>
      <Button
        variant="primary"
        block
        className="h-11 text-[13.5px] sm:h-12 sm:text-[14px]"
        onClick={() => onOpen(next.action.target)}
      >
        {t('next.cta', { action: next.action.label, item: lower })}
      </Button>
      <Button
        variant="link"
        size="sm"
        className="-mt-1 gap-1.5 self-center text-[12.5px] sm:text-[13px]"
        onClick={onToggleSteps}
      >
        {stepsShown ? t('next.hideSteps') : t('next.showSteps')}
        <IconArrowRight aria-hidden className="size-4 rtl:rotate-180" />
      </Button>
    </section>
  )
}
