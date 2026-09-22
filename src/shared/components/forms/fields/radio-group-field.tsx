import type { ReactNode } from 'react'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { HelperText, Radio } from '@/shared/components/ui'
import { cn } from '@/shared/utils/dom/cn'

export type RadioOption = {
  value: string
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
}

export type RadioGroupFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  options: RadioOption[]
  legend: string
  hint?: ReactNode
  required?: boolean
  disabled?: boolean
  /** Lay the choices out side by side instead of stacked. */
  inline?: boolean
  className?: string
}

/**
 * A small set of mutually exclusive choices, shown all at once rather than
 * hidden behind a select. Backs the restaurant's default menu language and the
 * template settings that offer a handful of fixed options.
 */
export function RadioGroupField<T extends FieldValues>({
  control,
  name,
  options,
  legend,
  hint,
  required,
  disabled,
  inline = false,
  className,
}: RadioGroupFieldProps<T>) {
  const { field, fieldState } = useController({ control, name })
  const error = fieldState.error?.message

  return (
    <fieldset className={cn('flex flex-col gap-2 pt-2', className)}>
      {/* A fieldset is labelled by its legend, not by a <label>. */}
      <legend className="label-caps text-[var(--muted)]">
        {legend}
        {required ? (
          <span aria-hidden className="ms-1 text-[15px] text-accent">
            *
          </span>
        ) : null}
      </legend>

      <div className={cn('flex gap-3', inline ? 'flex-row flex-wrap gap-6' : 'flex-col')}>
        {options.map((option) => (
          <Radio
            key={option.value}
            name={field.name}
            value={option.value}
            checked={field.value === option.value}
            onChange={() => field.onChange(option.value)}
            onBlur={field.onBlur}
            disabled={disabled || option.disabled}
            label={option.label}
            description={option.description}
          />
        ))}
      </div>

      {error ? (
        <HelperText tone="error">{error}</HelperText>
      ) : hint ? (
        <HelperText>{hint}</HelperText>
      ) : null}
    </fieldset>
  )
}
