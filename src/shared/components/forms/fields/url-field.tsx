import { Link2 } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import { TextField } from './text-field'

export type UrlFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  label?: ReactNode
  hint?: ReactNode
  required?: boolean
  optionalText?: ReactNode
  disabled?: boolean
  placeholder?: string
  className?: string
}

/**
 * A URL, kept left-to-right so the scheme and path do not reorder inside
 * Arabic copy. Backs the Google Maps link and every social link.
 */
export function UrlField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  required,
  optionalText,
  disabled,
  placeholder = 'https://',
  className,
}: UrlFieldProps<T>) {
  return (
    <TextField
      control={control}
      name={name}
      label={label}
      hint={hint}
      required={required}
      optionalText={optionalText}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
      type="url"
      inputMode="url"
      autoComplete="url"
      forceLtr
      leadingIcon={<Link2 />}
    />
  )
}
