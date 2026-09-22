import { Eye, EyeOff } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { FieldTrailingButton, Input } from '@/shared/components/ui'
import { Field } from '../layout/field'

export type TextFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  label?: ReactNode
  placeholder?: string
  hint?: ReactNode
  required?: boolean
  optionalText?: ReactNode
  disabled?: boolean
  autoComplete?: string
  leadingIcon?: ReactNode
  prefix?: ReactNode
  /** Shows a live `n / max` counter in the trailing slot. */
  maxLength?: number
  /** Renders a reveal toggle and starts masked. */
  password?: boolean
  /** Forces left-to-right entry, for URLs, slugs and codes inside Arabic copy. */
  forceLtr?: boolean
  inputMode?: 'text' | 'email' | 'url' | 'tel' | 'numeric' | 'decimal'
  type?: 'text' | 'email' | 'url' | 'tel'
  className?: string
}

/** Single-line text bound to a React Hook Form field. */
export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  hint,
  required,
  optionalText,
  disabled,
  autoComplete,
  leadingIcon,
  prefix,
  maxLength,
  password = false,
  forceLtr = false,
  inputMode,
  type = 'text',
  className,
}: TextFieldProps<T>) {
  const [revealed, setRevealed] = useState(false)
  const { field, fieldState } = useController({ control, name })
  const value = (field.value as string | null | undefined) ?? ''

  const counter = maxLength ? (
    <span className="tabular-nums">
      {value.length} / {maxLength}
    </span>
  ) : null

  const reveal = password ? (
    <FieldTrailingButton
      label={revealed ? 'Hide password' : 'Show password'}
      onClick={() => setRevealed((open) => !open)}
    >
      {revealed ? <EyeOff /> : <Eye />}
    </FieldTrailingButton>
  ) : null

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
        <Input
          id={id}
          name={field.name}
          ref={field.ref}
          value={value}
          onChange={field.onChange}
          onBlur={field.onBlur}
          type={password && !revealed ? 'password' : type}
          inputMode={inputMode}
          dir={forceLtr ? 'ltr' : undefined}
          className={forceLtr ? 'text-start' : undefined}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          maxLength={maxLength}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          tone={invalid ? 'error' : 'default'}
          leadingIcon={leadingIcon}
          prefix={prefix}
          trailing={reveal ?? counter}
        />
      )}
    </Field>
  )
}
