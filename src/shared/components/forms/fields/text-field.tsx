import { IconEye, IconEyeOff } from '@tabler/icons-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { FieldTrailingButton, Input } from '@/shared/components/ui'
import { Field } from '@/shared/components/forms/layout/field'

export type TextFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  label?: ReactNode
  placeholder?: string
  hint?: ReactNode
  required?: boolean
  optionalText?: ReactNode
  autoComplete?: string
  leadingIcon?: ReactNode
  /** Caps the text; its count shows under the field once it nears the cap. */
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
  autoComplete,
  leadingIcon,
  maxLength,
  password = false,
  forceLtr = false,
  inputMode,
  type = 'text',
  className,
}: TextFieldProps<T>) {
  const { t } = useTranslation()
  const [revealed, setRevealed] = useState(false)
  const { field, fieldState } = useController({ control, name })
  const value = (field.value as string | null | undefined) ?? ''

  const reveal = password ? (
    <FieldTrailingButton
      label={revealed ? t('textField.hidePassword') : t('textField.showPassword')}
      onClick={() => setRevealed((open) => !open)}
    >
      {revealed ? <IconEyeOff /> : <IconEye />}
    </FieldTrailingButton>
  ) : null

  return (
    <Field
      label={label}
      hint={hint}
      required={required}
      optionalText={optionalText}
      error={fieldState.error?.message}
      count={maxLength ? { length: value.length, max: maxLength } : undefined}
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
          autoComplete={autoComplete}
          maxLength={maxLength}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          tone={invalid ? 'error' : 'default'}
          leadingIcon={leadingIcon}
          trailing={reveal}
        />
      )}
    </Field>
  )
}
