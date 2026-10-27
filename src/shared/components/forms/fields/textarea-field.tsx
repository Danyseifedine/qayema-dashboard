import type { ReactNode } from 'react'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { Textarea } from '@/shared/components/ui'
import { Field } from '@/shared/components/forms/layout/field'

export type TextareaFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  label: ReactNode
  placeholder?: string
  optionalText?: ReactNode
  rows?: number
  maxLength: number
}

/** Multi-line text; its count shows under it once it nears the limit. */
export function TextareaField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  optionalText,
  rows = 4,
  maxLength,
}: TextareaFieldProps<T>) {
  const { field, fieldState } = useController({ control, name })
  const value = (field.value as string | null | undefined) ?? ''

  return (
    <Field
      label={label}
      optionalText={optionalText}
      error={fieldState.error?.message}
      count={{ length: value.length, max: maxLength }}
    >
      {({ id, describedBy, invalid }) => (
        <Textarea
          id={id}
          name={field.name}
          ref={field.ref}
          value={value}
          onChange={field.onChange}
          onBlur={field.onBlur}
          rows={rows}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          tone={invalid ? 'error' : 'default'}
        />
      )}
    </Field>
  )
}
