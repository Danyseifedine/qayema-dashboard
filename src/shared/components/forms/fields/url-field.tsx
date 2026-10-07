import { IconLink } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import { TextField } from '@/shared/components/forms/fields/text-field'

export type UrlFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  label?: ReactNode
  hint?: ReactNode
  required?: boolean
  optionalText?: ReactNode
  placeholder?: string
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
  placeholder = 'https://',
}: UrlFieldProps<T>) {
  return (
    <TextField
      control={control}
      name={name}
      label={label}
      hint={hint}
      required={required}
      optionalText={optionalText}
      placeholder={placeholder}
      type="url"
      inputMode="url"
      autoComplete="url"
      forceLtr
      leadingIcon={<IconLink />}
    />
  )
}
