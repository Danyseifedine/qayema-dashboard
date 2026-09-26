import { useId, type ReactNode } from 'react'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { HelperText } from '@/shared/components/ui'
import { cn } from '@/shared/utils/dom/cn'

export type ChoiceOption<V extends string> = {
  value: V
  label: string
  /** A small picture of the option — the point of this field over a select. */
  preview?: ReactNode
}

export type ChoiceFieldProps<T extends FieldValues, V extends string> = {
  control: Control<T>
  name: FieldPath<T>
  label: ReactNode
  options: readonly ChoiceOption<V>[]
  hint?: ReactNode
  disabled?: boolean
  className?: string
}

/**
 * One of a few options, shown as cards with a picture each.
 *
 * Real radio inputs underneath, so arrow keys move between options and a
 * screen reader hears a radio group — the cards are only the look. A group of
 * options has a legend rather than one label, which is why this is not built
 * on Field; it borrows Field's label style instead.
 */
export function ChoiceField<T extends FieldValues, V extends string>({
  control,
  name,
  label,
  options,
  hint,
  disabled,
  className,
}: ChoiceFieldProps<T, V>) {
  const { field, fieldState } = useController({ control, name })
  const hintId = useId()
  const error = fieldState.error?.message

  return (
    <fieldset
      className={cn('flex flex-col gap-2 pt-2', className)}
      disabled={disabled}
      aria-describedby={error || hint ? hintId : undefined}
    >
      <legend className="label-caps mb-2 text-[var(--muted)]">{label}</legend>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-2">
        {options.map((option) => {
          const checked = field.value === option.value

          return (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-1.5 rounded-[12px] border-[0.5px] px-2 py-2.5 text-center transition-colors',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--gold-on)]',
                checked
                  ? 'border-[var(--gold-on)] bg-[var(--hover-wash)]'
                  : 'border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--bg)]',
                disabled && 'cursor-not-allowed opacity-50',
              )}
            >
              <input
                type="radio"
                name={field.name}
                value={option.value}
                checked={checked}
                onChange={() => field.onChange(option.value)}
                onBlur={field.onBlur}
                className="sr-only"
              />
              {option.preview ? (
                <span aria-hidden className="flex size-9 items-center justify-center">
                  {option.preview}
                </span>
              ) : null}
              <span className="text-[12.5px] leading-tight">{option.label}</span>
            </label>
          )
        })}
      </div>

      {error ? (
        <HelperText id={hintId} tone="error">
          {error}
        </HelperText>
      ) : hint ? (
        <HelperText id={hintId}>{hint}</HelperText>
      ) : null}
    </fieldset>
  )
}
