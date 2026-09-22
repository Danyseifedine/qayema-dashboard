import type { ReactNode } from 'react'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { FieldShell, controlClass } from '@/shared/components/ui'
import { cn } from '@/shared/utils/dom/cn'
import { Field } from '../layout/field'

export type ColorFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  label?: ReactNode
  hint?: ReactNode
  required?: boolean
  disabled?: boolean
  className?: string
}

const HEX = /^#[0-9a-fA-F]{6}$/

/**
 * Hex colour with a live swatch that doubles as the native picker. Drives the
 * template settings editor and the QR studio, where every colour the owner can
 * change is stored as a `#rrggbb` string.
 */
export function ColorField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  required,
  disabled,
  className,
}: ColorFieldProps<T>) {
  const { field, fieldState } = useController({ control, name })
  const value = ((field.value as string | null | undefined) ?? '').trim()
  const valid = HEX.test(value)

  return (
    <Field
      label={label}
      hint={hint}
      required={required}
      error={fieldState.error?.message}
      className={className}
    >
      {({ id, describedBy, invalid }) => (
        <FieldShell tone={invalid ? 'error' : 'default'} disabled={disabled}>
          <span className="relative ms-2 inline-flex shrink-0">
            <input
              type="color"
              aria-label={`${typeof label === 'string' ? label : 'Colour'} picker`}
              value={valid ? value : '#000000'}
              onChange={(event) => field.onChange(event.target.value)}
              disabled={disabled}
              className={cn(
                'size-8 cursor-pointer rounded-lg border-[0.5px] border-[var(--line-strong)] bg-transparent p-0',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-on)]',
                '[&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-0',
                '[&::-webkit-color-swatch-wrapper]:p-1',
              )}
            />
          </span>
          <input
            id={id}
            name={field.name}
            ref={field.ref}
            value={value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            dir="ltr"
            spellCheck={false}
            placeholder="#F8D38D"
            maxLength={7}
            disabled={disabled}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={cn(controlClass, 'ps-2.5 font-mono text-start text-[14px] uppercase')}
          />
        </FieldShell>
      )}
    </Field>
  )
}
