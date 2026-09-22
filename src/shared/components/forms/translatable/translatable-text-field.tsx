import { useState, type ReactNode } from 'react'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { HelperText, Input, Label, Textarea } from '@/shared/components/ui'
import { LOCALES, LOCALE_DIR, LOCALE_LABELS, type Locale } from '@/shared/constants/locales'
import { cn } from '@/shared/utils/dom/cn'
import { LocaleTabs } from './locale-tabs'

export type TranslatableFieldProps<T extends FieldValues> = {
  control: Control<T>
  /** Base path of the `{en, ar}` object, e.g. `name`. */
  name: FieldPath<T>
  label?: ReactNode
  hint?: ReactNode
  required?: boolean
  optionalText?: ReactNode
  disabled?: boolean
  placeholder?: Partial<Record<Locale, string>>
  maxLength?: number
  /** Renders a textarea instead of a single-line input. */
  multiline?: boolean
  rows?: number
  className?: string
}

/**
 * One control per locale behind an EN/AR switch.
 *
 * Translatable API fields arrive as `{en, ar}` objects, and Laravel reports
 * their errors as `name.en` / `name.ar`. This reads both sub-fields so an
 * error on the hidden locale still shows: the tab gets a dot and the message
 * appears under the control.
 */
export function TranslatableTextField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  required,
  optionalText,
  disabled,
  placeholder,
  maxLength,
  multiline = false,
  rows = 4,
  className,
}: TranslatableFieldProps<T>) {
  const [active, setActive] = useState<Locale>('en')

  const en = useController({ control, name: `${name}.en` as FieldPath<T> })
  const ar = useController({ control, name: `${name}.ar` as FieldPath<T> })
  const byLocale = { en, ar } as const

  const current = byLocale[active]
  const value = (current.field.value as string | null | undefined) ?? ''
  const error = current.fieldState.error?.message

  // A locale is flagged when it has an error, or when it is empty on a
  // required field. Either way the owner needs to open that tab.
  const incomplete = LOCALES.filter((locale) => {
    const entry = byLocale[locale]
    const text = ((entry.field.value as string | null | undefined) ?? '').trim()
    return Boolean(entry.fieldState.error) || (required && text === '')
  })

  const otherLocale = active === 'en' ? 'ar' : 'en'
  const otherError = byLocale[otherLocale].fieldState.error?.message
  const controlId = `${String(name)}-${active}`
  const describedBy = error ? `${controlId}-error` : hint ? `${controlId}-hint` : undefined

  const shared = {
    id: controlId,
    name: current.field.name,
    value,
    onChange: current.field.onChange,
    onBlur: current.field.onBlur,
    dir: LOCALE_DIR[active],
    lang: active,
    placeholder: placeholder?.[active],
    disabled,
    maxLength,
    'aria-describedby': describedBy,
    'aria-invalid': Boolean(error) || undefined,
    tone: error ? ('error' as const) : ('default' as const),
  }

  return (
    <div className={cn('flex flex-col gap-2 pt-2', className)}>
      <div className="flex items-center justify-between gap-3">
        {label ? (
          <Label htmlFor={controlId} required={required} optionalText={optionalText}>
            {label}
          </Label>
        ) : (
          <span />
        )}
        <LocaleTabs value={active} onChange={setActive} incomplete={incomplete} />
      </div>

      {multiline ? (
        <Textarea {...shared} ref={current.field.ref} rows={rows} />
      ) : (
        <Input {...shared} ref={current.field.ref} />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {error ? (
            <HelperText id={`${controlId}-error`} tone="error">
              {error}
            </HelperText>
          ) : hint ? (
            <HelperText id={`${controlId}-hint`}>{hint}</HelperText>
          ) : null}
          {!error && otherError ? (
            <HelperText tone="error">
              {LOCALE_LABELS[otherLocale]}: {otherError}
            </HelperText>
          ) : null}
        </div>
        {maxLength ? (
          <HelperText className="shrink-0 tabular-nums">
            {value.length} / {maxLength}
          </HelperText>
        ) : null}
      </div>
    </div>
  )
}
