import { useEffect, useState, type ReactNode } from 'react'
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
import { mainLanguageOf, languageDir, languageName } from '@/shared/constants/menu-languages'
import { LocaleTabs } from '@/shared/components/forms/translatable/locale-tabs'
import { useWritingHelpOn } from '@/shared/hooks/use-writing-help'
import { WritingHelpButtons } from '@/shared/components/forms/translatable/writing-help-buttons'

export type TranslatableFieldProps<T extends FieldValues> = {
  control: Control<T>
  /** Base path of the `{en, fr, …}` object, e.g. `name`. */
  name: FieldPath<T>
  /** The menu's languages, English first. One language shows no tabs. */
  languages: readonly string[]
  label: ReactNode
  hint?: ReactNode
  /** Marks the main language as required: the one every name must have. */
  required?: boolean
  optionalText?: ReactNode
  placeholder?: Partial<Record<string, string>>
  maxLength: number
  /** Renders a textarea instead of a single-line input. */
  multiline?: boolean
  rows?: number
  /**
   * Makes this a description the writing help can write (or improve, once
   * there is text): a category's, from its name per language, or the
   * restaurant's, which the server writes from its menu.
   */
  write?:
    { kind: 'category'; name: Record<string, string | null | undefined> } | { kind: 'restaurant' }
}

/**
 * One control per menu language behind a tab switch.
 *
 * Translatable API fields arrive as `{en, fr}` objects, and Laravel reports
 * their errors as `name.en` / `name.fr`. Every language's value and error is
 * read, so a problem on a hidden tab still shows: the tab gets a dot and the
 * message appears under the control.
 *
 * While the writing help is on (`WritingHelpProvider`), a menu in two
 * languages gets "Translate", either way: the open tab's text into the other
 * language (which opens to show it), or the other's into an empty open tab.
 * Nothing is saved until the form is.
 */
export function TranslatableTextField<T extends FieldValues>({
  control,
  name,
  languages,
  label,
  hint,
  required,
  optionalText,
  placeholder,
  maxLength,
  multiline = false,
  rows = 4,
  write,
}: TranslatableFieldProps<T>) {
  const main = mainLanguageOf(languages)
  const [chosen, setChosen] = useState<string>(main)
  // The menu's languages can change under an open form (Settings); fall back
  // to the main one rather than point at a tab that is gone.
  const active = languages.includes(chosen) ? chosen : main

  const current = useController({ control, name: `${name}.${active}` as FieldPath<T> })
  const all = (useWatch({ control, name }) ?? {}) as Record<string, string | null | undefined>
  const { errors } = useFormState({ control, name })
  const errorOf = (code: string) =>
    (get(errors, `${name}.${code}`) as { message?: string } | undefined)?.message

  const value = (current.field.value as string | null | undefined) ?? ''
  const error = current.fieldState.error?.message

  const helpOn = useWritingHelpOn()
  // A menu has its main language and at most one more: the tab not open.
  const peer = languages.find((code) => code !== active)

  // A translation lands in its language's control, so it waits for that tab
  // to be the open one.
  const [translated, setTranslated] = useState<{ code: string; text: string } | null>(null)
  const { onChange } = current.field
  useEffect(() => {
    if (translated === null || translated.code !== active) return
    onChange(translated.text)
    setTranslated(null)
  }, [translated, active, onChange])

  // A language is flagged when it has an error, or when the main one is
  // empty on a required field. Either way the owner needs to open that tab.
  const incomplete = languages.filter(
    (code) =>
      Boolean(errorOf(code)) || (required && code === main && (all[code] ?? '').trim() === ''),
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
    maxLength,
    'aria-describedby': describedBy,
    'aria-invalid': Boolean(error) || undefined,
    tone: error ? ('error' as const) : ('default' as const),
  }

  return (
    <div className="flex flex-col gap-2 pt-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={controlId} required={required} optionalText={optionalText}>
          {label}
        </Label>
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

      {helpOn && (peer || write) ? (
        <WritingHelpButtons
          active={active}
          text={value.trim()}
          peer={peer}
          peerText={peer ? (all[peer] ?? '').trim() : ''}
          write={
            write?.kind === 'category'
              ? {
                  kind: 'category',
                  subject: (write.name[active] ?? '').trim() || (write.name[main] ?? '').trim(),
                }
              : (write ?? null)
          }
          onTranslated={(code, text) => {
            setTranslated({ code, text })
            setChosen(code)
          }}
          onWritten={onChange}
        />
      ) : null}

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
        <HelperText className="shrink-0 tabular-nums">
          <span dir="ltr">
            {value.length} / {maxLength}
          </span>
        </HelperText>
      </div>
    </div>
  )
}
