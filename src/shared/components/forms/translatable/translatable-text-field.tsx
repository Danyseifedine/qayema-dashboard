import { useState, type ReactNode } from 'react'
import {
  get,
  useController,
  useFormState,
  useWatch,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'
import { HelperText, Input, Label, Textarea } from '@/shared/components/ui'
import { MAIN_LANGUAGE, languageDir, languageName } from '@/shared/constants/menu-languages'
import { cn } from '@/shared/utils/dom/cn'
import { LocaleTabs } from '@/shared/components/forms/translatable/locale-tabs'

export type TranslatableFieldProps<T extends FieldValues> = {
  control: Control<T>
  /** Base path of the `{en, fr, …}` object, e.g. `name`. */
  name: FieldPath<T>
  /** The menu's languages, English first. One language shows no tabs. */
  languages: readonly string[]
  label?: ReactNode
  hint?: ReactNode
  /** Marks English as required: the one language every name must have. */
  required?: boolean
  optionalText?: ReactNode
  disabled?: boolean
  placeholder?: Partial<Record<string, string>>
  maxLength?: number
  /** Renders a textarea instead of a single-line input. */
  multiline?: boolean
  rows?: number
  className?: string
}

/**
 * One control per menu language behind a tab switch.
 *
 * Translatable API fields arrive as `{en, fr}` objects, and Laravel reports
 * their errors as `name.en` / `name.fr`. Every language's value and error is
 * read, so a problem on a hidden tab still shows: the tab gets a dot and the
 * message appears under the control.
 */
export function TranslatableTextField<T extends FieldValues>({
  control,
  name,
  languages,
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
  const [chosen, setChosen] = useState<string>(MAIN_LANGUAGE)
  // The menu's languages can change under an open form (Settings); fall back
  // to English rather than point at a tab that is gone.
  const active = languages.includes(chosen) ? chosen : (languages[0] ?? MAIN_LANGUAGE)

  const current = useController({ control, name: `${name}.${active}` as FieldPath<T> })
  const all = (useWatch({ control, name }) ?? {}) as Record<string, string | null | undefined>
  const { errors } = useFormState({ control, name })
  const errorOf = (code: string) =>
    (get(errors, `${name}.${code}`) as { message?: string } | undefined)?.message

  const value = (current.field.value as string | null | undefined) ?? ''
  const error = current.fieldState.error?.message

  // A language is flagged when it has an error, or when English is empty on a
  // required field. Either way the owner needs to open that tab.
  const incomplete = languages.filter(
    (code) =>
      Boolean(errorOf(code)) ||
      (required && code === MAIN_LANGUAGE && (all[code] ?? '').trim() === ''),
  )

  const hidden = languages.find((code) => code !== active && errorOf(code))
  const controlId = `${String(name)}-${active}`
  const describedBy = error ? `${controlId}-error` : hint ? `${controlId}-hint` : undefined

  const shared = {
    id: controlId,
    name: current.field.name,
    value,
    onChange: current.field.onChange,
    onBlur: current.field.onBlur,
    dir: languageDir(active),
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
        {languages.length > 1 ? (
          <LocaleTabs
            languages={languages}
            value={active}
            onChange={setChosen}
            incomplete={incomplete}
          />
        ) : null}
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
          {!error && hidden ? (
            <HelperText tone="error">
              {languageName(hidden)}: {errorOf(hidden)}
            </HelperText>
          ) : null}
        </div>
        {maxLength ? (
          <HelperText className="shrink-0 tabular-nums">
            <span dir="ltr">
              {value.length} / {maxLength}
            </span>
          </HelperText>
        ) : null}
      </div>
    </div>
  )
}
