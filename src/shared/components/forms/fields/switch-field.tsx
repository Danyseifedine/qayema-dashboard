import type { ReactNode } from 'react'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { HelperText, Switch } from '@/shared/components/ui'
import { cn } from '@/shared/utils/dom/cn'

export type SwitchFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
  className?: string
}

/**
 * Label on one side, toggle on the other, as `.ui-switch-row` in the portal.
 * Used for dish availability and the template's boolean settings.
 */
export function SwitchField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  className,
}: SwitchFieldProps<T>) {
  const { field, fieldState } = useController({ control, name })
  const descriptionId = description ? `${field.name}-desc` : undefined

  return (
    <div className={cn('flex flex-col gap-1.5 pt-2', className)}>
      <div className="flex items-center justify-between gap-3.5">
        <div className="flex flex-col gap-0.5">
          <span id={`${field.name}-label`} className="text-[14px] text-[var(--text)]">
            {label}
          </span>
          {description ? (
            <span id={descriptionId} className="text-[12px] leading-[1.45] text-[var(--muted)]">
              {description}
            </span>
          ) : null}
        </div>
        <Switch
          checked={Boolean(field.value)}
          onChange={field.onChange}
          disabled={disabled}
          aria-labelledby={`${field.name}-label`}
          aria-describedby={descriptionId}
        />
      </div>
      {fieldState.error?.message ? (
        <HelperText tone="error">{fieldState.error.message}</HelperText>
      ) : null}
    </div>
  )
}
