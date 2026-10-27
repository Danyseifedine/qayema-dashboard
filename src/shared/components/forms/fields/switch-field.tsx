import type { ReactNode } from 'react'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { HelperText, SwitchRow } from '@/shared/components/ui'
import { cn } from '@/shared/utils/dom/cn'

export type SwitchFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  label: ReactNode
  description?: ReactNode
  className?: string
}

/** A `SwitchRow` bound to a form field: dish availability, a design's on/off settings. */
export function SwitchField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
}: SwitchFieldProps<T>) {
  const { field, fieldState } = useController({ control, name })

  return (
    <div className={cn('flex flex-col gap-1.5 pt-2', className)}>
      <SwitchRow
        checked={Boolean(field.value)}
        onChange={field.onChange}
        label={label}
        description={description}
      />
      {fieldState.error?.message ? (
        <HelperText tone="error">{fieldState.error.message}</HelperText>
      ) : null}
    </div>
  )
}
