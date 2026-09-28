import type { ReactNode } from 'react'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { Input } from '@/shared/components/ui'
import { Field } from '@/shared/components/forms/layout/field'

export type PriceFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  /** Restaurant currency code, shown as a prefix inside the field. */
  currency: string
  label?: ReactNode
  hint?: ReactNode
}

/**
 * Money entry. Always left-to-right and tabular, even in Arabic, and it hands
 * the form a `number` rather than the input's string so the Zod schema can
 * check `price >= 0` without coercion at the call site.
 */
export function PriceField<T extends FieldValues>({
  control,
  name,
  currency,
  label,
  hint,
}: PriceFieldProps<T>) {
  const { field, fieldState } = useController({ control, name })
  const value = field.value as number | string | null | undefined

  return (
    <Field label={label} hint={hint} error={fieldState.error?.message}>
      {({ id, describedBy, invalid }) => (
        <Input
          id={id}
          name={field.name}
          ref={field.ref}
          value={value ?? ''}
          onChange={(event) => {
            const raw = event.target.value
            field.onChange(raw === '' ? null : Number(raw))
          }}
          onBlur={field.onBlur}
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          dir="ltr"
          placeholder="0.00"
          prefix={currency}
          className="text-start tabular-nums"
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          tone={invalid ? 'error' : 'default'}
        />
      )}
    </Field>
  )
}
