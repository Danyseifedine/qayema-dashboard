import { useState, type ReactNode } from 'react'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { Input } from '@/shared/components/ui'
import { Field } from '../layout/field'

const HEX = /^#[0-9a-fA-F]{6}$/

export type ColorFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  label: ReactNode
  hint?: ReactNode
  disabled?: boolean
  className?: string
}

/**
 * A colour, bound to a React Hook Form field as `#RRGGBB`.
 *
 * The swatch opens the system picker; the text beside it takes a pasted or
 * typed hex. While typing, a half-finished value lives only in the input and
 * the form keeps the last whole colour, so the preview never flashes invalid.
 */
export function ColorField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  disabled,
  className,
}: ColorFieldProps<T>) {
  const { field, fieldState } = useController({ control, name })
  const value = typeof field.value === 'string' && HEX.test(field.value) ? field.value : '#000000'

  // What is in the text box while it has focus; null means "show the value".
  const [typing, setTyping] = useState<string | null>(null)

  const commit = (next: string) => field.onChange(next.toUpperCase())

  return (
    <Field label={label} hint={hint} error={fieldState.error?.message} className={className}>
      {({ id, describedBy, invalid }) => (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value.toLowerCase()}
            onChange={(event) => commit(event.target.value)}
            disabled={disabled}
            aria-label={typeof label === 'string' ? `${label}, picker` : 'Colour picker'}
            className="size-11 shrink-0 cursor-pointer rounded-[var(--radius-control)] border-[0.5px] border-[var(--line)] bg-[var(--surface)] p-1 disabled:cursor-not-allowed [&::-moz-color-swatch]:rounded-[6px] [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-[6px] [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
          />
          <Input
            id={id}
            name={field.name}
            ref={field.ref}
            value={typing ?? value}
            onFocus={() => setTyping(value)}
            onChange={(event) => {
              const next = event.target.value.trim()
              setTyping(next)
              if (HEX.test(next)) commit(next)
            }}
            onBlur={() => {
              setTyping(null)
              field.onBlur()
            }}
            disabled={disabled}
            dir="ltr"
            spellCheck={false}
            autoComplete="off"
            maxLength={7}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            tone={invalid ? 'error' : 'default'}
            className="font-mono uppercase"
          />
        </div>
      )}
    </Field>
  )
}
