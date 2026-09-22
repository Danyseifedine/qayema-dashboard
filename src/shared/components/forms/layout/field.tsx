import { useId, type ReactNode } from 'react'
import { HelperText, Label } from '@/shared/components/ui'
import { cn } from '@/shared/utils/dom/cn'

export type FieldProps = {
  label?: ReactNode
  /** Quiet note on the trailing side of the label, e.g. "optional". */
  optionalText?: ReactNode
  required?: boolean
  /** Shown under the control while there is no error. */
  hint?: ReactNode
  /** When set, the control renders in its error tone and this replaces the hint. */
  error?: string
  className?: string
  /**
   * Receives the ids the control must carry so the label, hint and error are
   * announced by screen readers.
   */
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode
}

/**
 * Label, control, and one line of help underneath. Every field component in
 * this folder renders through here, so spacing and a11y wiring are identical
 * across the dashboard.
 */
export function Field({
  label,
  optionalText,
  required,
  hint,
  error,
  className,
  children,
}: FieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const invalid = Boolean(error)
  const describedBy = invalid ? errorId : hint ? hintId : undefined

  return (
    <div className={cn('flex flex-col gap-2 pt-2', className)}>
      {label ? (
        <Label htmlFor={id} required={required} optionalText={optionalText}>
          {label}
        </Label>
      ) : null}

      {children({ id, describedBy, invalid })}

      {invalid ? (
        <HelperText id={errorId} tone="error">
          {error}
        </HelperText>
      ) : hint ? (
        <HelperText id={hintId}>{hint}</HelperText>
      ) : null}
    </div>
  )
}
