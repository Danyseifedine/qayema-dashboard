import type { ReactNode } from 'react'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { HelperText, Textarea } from '@/shared/components/ui'
import { Field } from '../layout/field'

export type TextareaFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  label?: ReactNode
  placeholder?: string
  hint?: ReactNode
  required?: boolean
  optionalText?: ReactNode
  disabled?: boolean
  rows?: number
  maxLength?: number
  className?: string
}

/** Multi-line text with an optional character counter under the control. */
export function TextareaField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  hint,
  required,
  optionalText,
  disabled,
  rows = 4,
  maxLength,
  className,
}: TextareaFieldProps<T>) {
  const { field, fieldState } = useController({ control, name })
  const value = (field.value as string | null | undefined) ?? ''

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
        <div className="flex flex-col gap-1.5">
          <Textarea
            id={id}
            name={field.name}
            ref={field.ref}
            value={value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            rows={rows}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            tone={invalid ? 'error' : 'default'}
          />
          {maxLength ? (
            <HelperText className="text-end tabular-nums">
              {value.length} / {maxLength}
            </HelperText>
          ) : null}
        </div>
      )}
    </Field>
  )
}
