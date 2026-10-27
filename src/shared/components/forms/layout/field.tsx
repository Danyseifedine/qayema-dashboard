import { useId, type ReactNode } from 'react'
import { HelperText, Label } from '@/shared/components/ui'
import { cn } from '@/shared/utils/dom/cn'
import { isNearLimit } from '@/shared/utils/limits/is-near-limit'

export type FieldProps = {
  label?: ReactNode
  /** Quiet note on the trailing side of the label, e.g. "optional". */
  optionalText?: ReactNode
  /**
   * A small control on the trailing side of the label row, e.g. "Reset".
   * Kept outside the <label> so clicking it never focuses the field.
   */
  action?: ReactNode
  required?: boolean
  /** Shown under the control while there is no error. */
  hint?: ReactNode
  /** When set, the control renders in its error tone and this replaces the hint. */
  error?: string
  /** The text's length and limit: a count shows under the control once it nears the limit. */
  count?: { length: number; max: number }
  className?: string
  /**
   * Receives the ids the control must carry so the label, hint and error are
   * announced by screen readers.
   */
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode
}

/** "245 / 255" at the end of the line under a field, only once the text nears its limit. */
export function CharacterCount({ length, max }: { length: number; max: number }) {
  if (!isNearLimit(length, max)) return null
  return (
    <HelperText className="shrink-0 tabular-nums">
      <span dir="ltr">
        {length} / {max}
      </span>
    </HelperText>
  )
}

/**
 * Label, control, and one line of help underneath. Every field component in
 * this folder renders through here, so spacing and a11y wiring are identical
 * across the dashboard.
 */
export function Field({
  label,
  optionalText,
  action,
  required,
  hint,
  error,
  count,
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
        <div className="flex min-h-5 items-center justify-between gap-2">
          <Label htmlFor={id} required={required} optionalText={optionalText} className="flex-1">
            {label}
          </Label>
          {action}
        </div>
      ) : null}

      {children({ id, describedBy, invalid })}

      <div className="flex items-start justify-between gap-3 empty:hidden">
        {invalid ? (
          <HelperText id={errorId} tone="error" className="min-w-0">
            {error}
          </HelperText>
        ) : hint ? (
          <HelperText id={hintId} className="min-w-0">
            {hint}
          </HelperText>
        ) : null}
        {count ? <CharacterCount length={count.length} max={count.max} /> : null}
      </div>
    </div>
  )
}
