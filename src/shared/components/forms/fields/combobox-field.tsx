import type { ReactNode } from 'react'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { Combobox, type ComboboxOption } from '@/shared/components/ui'
import { Field } from '../layout/field'

export type ComboboxFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  options: ComboboxOption[]
  label?: ReactNode
  placeholder?: string
  hint?: ReactNode
  required?: boolean
  optionalText?: ReactNode
  disabled?: boolean
  /** Stores the chosen value as a number, for an id or similar. */
  numeric?: boolean
  searchable?: boolean
  emptyText?: string
  className?: string
}

/** A searchable select bound to a React Hook Form field. */
export function ComboboxField<T extends FieldValues>({
  control,
  name,
  options,
  label,
  placeholder,
  hint,
  required,
  optionalText,
  disabled,
  numeric = false,
  searchable = true,
  emptyText,
  className,
}: ComboboxFieldProps<T>) {
  const { field, fieldState } = useController({ control, name })
  const value = field.value as string | number | null | undefined

  return (
    <Field
      label={label}
      hint={hint}
      required={required}
      optionalText={optionalText}
      error={fieldState.error?.message}
      className={className}
    >
      {({ id, describedBy, invalid }) => (
        <Combobox
          id={id}
          name={field.name}
          inputRef={field.ref}
          value={value === null || value === undefined ? null : String(value)}
          onChange={(next) => {
            if (!numeric) return field.onChange(next)
            if (next === null) return field.onChange(null)
            const parsed = Number(next)
            // A non-numeric option value would otherwise put NaN in the form.
            field.onChange(Number.isNaN(parsed) ? null : parsed)
          }}
          onBlur={field.onBlur}
          options={options}
          placeholder={placeholder}
          searchable={searchable}
          emptyText={emptyText}
          disabled={disabled}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          tone={invalid ? 'error' : 'default'}
        />
      )}
    </Field>
  )
}
