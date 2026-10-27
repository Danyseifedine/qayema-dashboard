import type { ReactNode } from 'react'
import { useController, type Control } from 'react-hook-form'
import { Field } from '@/shared/components/forms'
import { Segmented } from '@/shared/components/ui'
import type { OfferFormValues } from '@/features/offers/schemas/offer.schema'

export type OfferControl = Control<OfferFormValues>

/** One part of a step, under its heading. */
export function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1 border-t-[0.5px] border-[var(--line)] pt-4 first:border-t-0 first:pt-0">
      <h3 className="font-display text-[17px] leading-tight">{title}</h3>
      {children}
    </section>
  )
}

/** A segmented choice bound to one form field, with its label above and its error below. */
export function SegmentedField<V extends string | number>({
  control,
  name,
  label,
  options,
  hint,
  onPick,
}: {
  control: OfferControl
  name:
    | 'show_again'
    | 'delay_seconds'
    | 'ad_delay_seconds'
    | 'ad_seconds'
    | 'action'
    | 'discount_type'
    | 'gives'
  label: string
  /** A choice may be closed (the package lacks it). */
  options: { value: V; label: string; disabled?: boolean }[]
  hint?: string
  /** Takes the pick instead of the field, for a choice that changes more (or asks first). */
  onPick?: (value: V) => void
}) {
  const { field, fieldState } = useController({ control, name })

  return (
    <Field label={label} hint={hint} error={fieldState.error?.message}>
      {() => (
        <Segmented<string>
          block
          value={String(field.value)}
          onChange={(value) => {
            const picked = options.find((option) => String(option.value) === value)
            if (picked) (onPick ?? field.onChange)(picked.value)
          }}
          aria-label={label}
          options={options.map((option) => ({
            value: String(option.value),
            label: option.label,
            disabled: option.disabled,
          }))}
        />
      )}
    </Field>
  )
}
