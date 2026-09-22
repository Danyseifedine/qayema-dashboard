import type { ReactNode } from 'react'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { Checkbox, HelperText } from '@/shared/components/ui'
import { cn } from '@/shared/utils/dom/cn'

export type CheckboxFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
  className?: string
}

/** A single boolean checkbox, e.g. accepting the terms. */
export function CheckboxField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  className,
}: CheckboxFieldProps<T>) {
  const { field, fieldState } = useController({ control, name })
  const invalid = Boolean(fieldState.error)

  return (
    <div className={cn('flex flex-col gap-1.5 pt-2', className)}>
      <Checkbox
        name={field.name}
        ref={field.ref}
        checked={Boolean(field.value)}
        onChange={(event) => field.onChange(event.target.checked)}
        onBlur={field.onBlur}
        disabled={disabled}
        label={label}
        description={description}
        tone={invalid ? 'error' : 'default'}
        aria-invalid={invalid || undefined}
      />
      {fieldState.error?.message ? (
        <HelperText tone="error">{fieldState.error.message}</HelperText>
      ) : null}
    </div>
  )
}
