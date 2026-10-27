import type { ReactNode } from 'react'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { Field } from '@/shared/components/forms/layout/field'
import { Input } from '@/shared/components/ui'

export type DateFieldProps<T extends FieldValues> = {
  control: Control<T>
  /** A field holding "YYYY-MM-DD", or '' for no date. */
  name: FieldPath<T>
  label: ReactNode
  hint?: ReactNode
  optionalText?: ReactNode
  /** The earliest day it offers, "YYYY-MM-DD". */
  min?: string
}

/**
 * A calendar day, on the phone's or browser's own date picker (dark, like
 * the dashboard: `color-scheme` in tokens.css), stored as "YYYY-MM-DD" and
 * '' when cleared. An offer's first and last day use it.
 */
export function DateField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  optionalText,
  min,
}: DateFieldProps<T>) {
  const { field, fieldState } = useController({ control, name })

  return (
    <Field label={label} hint={hint} optionalText={optionalText} error={fieldState.error?.message}>
      {({ id, describedBy, invalid }) => (
        <Input
          id={id}
          type="date"
          name={field.name}
          ref={field.ref}
          value={typeof field.value === 'string' ? field.value : ''}
          min={min}
          onChange={(event) => field.onChange(event.target.value)}
          onBlur={field.onBlur}
          // Read left to right in Arabic too, like every date in the dashboard.
          dir="ltr"
          className="text-start"
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          tone={invalid ? 'error' : 'default'}
        />
      )}
    </Field>
  )
}
