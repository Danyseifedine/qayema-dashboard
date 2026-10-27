import {
  IconAppWindow,
  IconCheck,
  IconLayoutNavbar,
  IconSpeakerphone,
  type TablerIcon,
} from '@tabler/icons-react'
import { useController, type Control } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Field } from '@/shared/components/forms'
import { cn } from '@/shared/utils/dom/cn'
import {
  OVERLAYS,
  PLACEMENTS,
  type OfferFormValues,
  type Placement,
} from '@/features/offers/schemas/offer.schema'
import type { SlotUse } from '@/features/offers/utils/slots'

const ICONS: Record<Placement, TablerIcon> = {
  banner: IconLayoutNavbar,
  popup: IconAppWindow,
  ad: IconSpeakerphone,
}

/** A place's slots on the package, and whether this offer is kept out of it (all in use). */
export type PlacementRoom = Partial<Record<Placement, { use: SlotUse; full: boolean }>>

const NO_ROOM: PlacementRoom = {}

/**
 * Where the offer shows, in two groups of tiles that light up when picked:
 * the banner in the menu, and over it a pop-up, a short ad or both. Each
 * place says how many of its package's slots are in use; a full one is
 * closed to an offer that does not already hold one there, and one the
 * package leaves out (a count of 0) is closed to every offer, said so.
 */
export function PlacementPicker({
  control,
  room = NO_ROOM,
}: {
  control: Control<OfferFormValues>
  room?: PlacementRoom
}) {
  const { t } = useTranslation('offers')
  const { field, fieldState } = useController({ control, name: 'placements' })
  const picked = field.value

  const toggle = (placement: Placement) =>
    field.onChange(
      picked.includes(placement)
        ? picked.filter((other) => other !== placement)
        : PLACEMENTS.filter((option) => option === placement || picked.includes(option)),
    )

  const group = (name: string, hint: string | null, options: readonly Placement[]) => (
    <div role="group" aria-label={name} className="flex flex-col gap-1.5">
      <p className="text-[13px] font-medium text-[var(--text)]">
        {name}
        {hint ? <span className="ms-1.5 font-normal text-[var(--muted)]">{hint}</span> : null}
      </p>
      {/* Two side by side; one alone (the banner) takes the row. */}
      <div className={cn('grid gap-2', options.length > 1 && 'sm:grid-cols-2')}>
        {options.map((placement) => {
          const Icon = ICONS[placement]
          const on = picked.includes(placement)
          const slots = room[placement]
          // Not on the package (a count of 0), or full: it can be let go
          // of, never taken.
          const off = slots?.use.limit === 0
          const closed = (off || slots?.full === true) && !on
          return (
            <button
              key={placement}
              type="button"
              aria-pressed={on}
              disabled={closed}
              onClick={() => toggle(placement)}
              className={cn(
                'flex items-start gap-3 rounded-tile border-[0.5px] p-3 text-start transition-colors',
                'focus-ring disabled:cursor-not-allowed disabled:opacity-60',
                on
                  ? 'border-accent-border bg-accent-wash'
                  : 'border-[var(--line)] enabled:hover:border-[var(--line-strong)]',
              )}
            >
              <span
                className={cn(
                  'grid size-9 shrink-0 place-items-center rounded-tile',
                  on ? 'bg-gold text-ink' : 'inset-tile text-[var(--muted)]',
                )}
              >
                <Icon aria-hidden className="size-[18px]" stroke={1.7} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[14px] font-medium">
                  {t(`placements.${placement}.name`)}
                  {on ? <IconCheck aria-hidden className="size-3.5 text-accent" /> : null}
                </span>
                <span className="mt-0.5 block text-[12px] leading-snug text-[var(--muted)]">
                  {t(`placements.${placement}.hint`)}
                </span>
                {slots && slots.use.limit !== null ? (
                  <span
                    className={cn(
                      'mt-1 block text-[11.5px] leading-snug',
                      off || slots.full ? 'text-status-warn' : 'text-[var(--faint)]',
                    )}
                  >
                    {off
                      ? t(`slots.offPackage.${placement}`)
                      : slots.full
                        ? t('slots.tileFull')
                        : t('slots.tile', { used: slots.use.used, limit: slots.use.limit })}
                  </span>
                ) : null}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    // No label of its own: the editor's "Where it shows" heads it.
    <Field hint={t('editor.whereHint')} error={fieldState.error?.message}>
      {({ describedBy }) => (
        <div aria-describedby={describedBy} className="flex flex-col gap-4">
          {group(t('editor.inMenu'), null, ['banner'])}
          {group(t('editor.overMenu'), t('editor.overMenuHint'), OVERLAYS)}
        </div>
      )}
    </Field>
  )
}
