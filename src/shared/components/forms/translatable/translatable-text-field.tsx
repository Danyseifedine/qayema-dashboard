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
import { CharacterCount } from '@/shared/components/forms/layout/field'
import { isNearLimit } from '@/shared/utils/limits/is-near-limit'
import { cn } from '@/shared/utils/dom/cn'
import { mainLanguageOf, languageDir, languageName } from '@/shared/constants/menu-languages'
import { LocaleTabs } from '@/shared/components/forms/translatable/locale-tabs'
import { useWritingHelp } from '@/shared/hooks/use-writing-help'
import {
  WritingHelpButtons,
  WritingHelpSpentNote,
  type WritingHelpButtonsProps,
} from '@/shared/components/forms/translatable/writing-help-buttons'

export type TranslatableFieldProps<T extends FieldValues> = {
  control: Control<T>
  /** Base path of the `{en, fr, …}` object, e.g. `name`. */
  name: FieldPath<T>
  /** The menu's languages, its main one first. One language shows no tabs. */
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
  /**
   * Rewrites the text when the owner leaves the control, e.g. a dish's
   * ingredients into a clean list, so they see what will be saved.
   */
  tidy?: (text: string, language: string) => string
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
 * languages gets a small "Translate" beside the tabs, either way: the open
 * tab's text into the other language (which opens to show it), or the
 * other's into an empty open tab. Nothing is saved until the form is.
 *
 * The count of characters shows only once the text nears the limit.
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
  tidy,
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

  const helpOn = useWritingHelp().uses !== null
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
  const nearLimit = isNearLimit(value.length, maxLength)
  const controlId = `${String(name)}-${active}`
  const describedBy = error ? `${controlId}-error` : hint ? `${controlId}-hint` : undefined

  const helpProps: WritingHelpButtonsProps = {
    active,
    text: value.trim(),
    peer,
    peerText: peer ? (all[peer] ?? '').trim() : '',
    write:
      write?.kind === 'category'
        ? {
            kind: 'category',
            subject: (write.name[active] ?? '').trim() || (write.name[main] ?? '').trim(),
          }
        : (write ?? null),
    maxLength,
    onTranslated: (code, text) => {
      setTranslated({ code, text })
      setChosen(code)
    },
    onWritten: onChange,
  }

  const shared = {
    id: controlId,
    name: current.field.name,
    value,
    onChange: current.field.onChange,
    onBlur: () => {
      const tidied = tidy?.(value, active)
      if (tidied !== undefined && tidied !== value) current.field.onChange(tidied)
      current.field.onBlur()
    },
    dir: languageDir(active),
    lang: active,
    // A language with no example of its own borrows the English one.
    placeholder: placeholder?.[active] ?? placeholder?.en,
    maxLength,
    'aria-describedby': describedBy,
    'aria-invalid': Boolean(error) || undefined,
    tone: error ? ('error' as const) : ('default' as const),
  }

  // The AI buttons, when the writing help is on: Translate beside the tabs,
  // "Write with AI" inside a description's box, in its bottom end corner.
  const field = (ai: { translate: ReactNode; write: ReactNode } | null) => (
    <div className="flex flex-col gap-2 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <Label htmlFor={controlId} required={required} optionalText={optionalText}>
          {label}
        </Label>
        <div className="flex items-center gap-1.5">
          {multiline ? null : ai?.write}
          {ai?.translate}
          {languages.length > 1 ? (
            <LocaleTabs
              languages={languages}
              value={active}
              onChange={setChosen}
              incomplete={incomplete}
            />
          ) : null}
        </div>
      </div>

      {multiline ? (
        // Its rows set its height, a short list's too.
        <div className="relative">
          <Textarea
            {...shared}
            ref={current.field.ref}
            rows={rows}
            // Room under the text for "Write with AI", which takes the
            // corner the resize handle would.
            className={cn('min-h-0', ai?.write && 'resize-none pb-11')}
          />
          {ai?.write ? <div className="absolute end-2 bottom-2">{ai.write}</div> : null}
        </div>
      ) : (
        <Input {...shared} ref={current.field.ref} />
      )}

      {helpOn && (peer || write) ? (
        <WritingHelpSpentNote
          actions={[
            ...(peer ? (['translation'] as const) : []),
            ...(write ? (['description'] as const) : []),
          ]}
        />
      ) : null}

      {error || hint || hidden || nearLimit ? (
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
          <CharacterCount length={value.length} max={maxLength} />
        </div>
      ) : null}
    </div>
  )

  return helpOn && (peer || write) ? (
    <WritingHelpButtons {...helpProps}>{field}</WritingHelpButtons>
  ) : (
    field(null)
  )
}
