import type { ReactNode } from 'react'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { Field } from '@/shared/components/forms/layout/field'
import { DatePicker } from '@/shared/components/ui'

export type DateFieldProps<T extends FieldValues> = {
  control: Control<T>
  /** A field holding "YYYY-MM-DD", or '' for no date. */
  name: FieldPath<T>
  label: ReactNode
  hint?: ReactNode
  optionalText?: ReactNode
  /** The earliest day it offers, "YYYY-MM-DD". */
  min?: string
  /** The latest day it offers, "YYYY-MM-DD". */
  max?: string
}

/**
 * A calendar day on the dashboard's own calendar (`DatePicker`), stored as
 * "YYYY-MM-DD" and '' when cleared. An offer's first and last day use it.
 */
export function DateField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  optionalText,
  min,
  max,
}: DateFieldProps<T>) {
  const { field, fieldState } = useController({ control, name })

  return (
    <Field label={label} hint={hint} optionalText={optionalText} error={fieldState.error?.message}>
      {({ id, describedBy, invalid }) => (
        <DatePicker
          id={id}
          inputRef={field.ref}
          value={typeof field.value === 'string' ? field.value : ''}
          min={min}
          max={max}
          onChange={field.onChange}
          onBlur={field.onBlur}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          tone={invalid ? 'error' : 'default'}
        />
      )}
    </Field>
  )
}
