import { get, useController, useFormState, type Control, type FieldPath } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { HelperText, Input } from '@/shared/components/ui'
import { languageDir, languageName } from '@/shared/constants/menu-languages'
import { cn } from '@/shared/utils/dom/cn'
import { CHOICE_LIMITS } from '@/features/menu/dishes/schemas/dish-choices.schema'
import type { DishFormInput } from '@/features/menu/dishes/schemas/dish.schema'

type Path = FieldPath<DishFormInput>

export type ChoiceNameInputProps = {
  control: Control<DishFormInput>
  /** The row's `name` map, e.g. `variants.0.options.1.name`. */
  name: string
  /** The language being written, from the section's tabs. */
  language: string
  label: string
  placeholder?: string
  className?: string
}

/**
 * One language of a variant's, option's or add-on's name. The section shows
 * one language at a time for every row, so a long list stays one line each.
 */
export function ChoiceNameInput({
  control,
  name,
  language,
  label,
  placeholder,
  className,
}: ChoiceNameInputProps) {
  const { field, fieldState } = useController({ control, name: `${name}.${language}` as Path })

  return (
    <Input
      ref={field.ref}
      name={field.name}
      value={(field.value as string | null | undefined) ?? ''}
      onChange={field.onChange}
      onBlur={field.onBlur}
      aria-label={label}
      aria-invalid={Boolean(fieldState.error) || undefined}
      tone={fieldState.error ? 'error' : 'default'}
      dir={languageDir(language)}
      lang={language}
      placeholder={placeholder}
      maxLength={CHOICE_LIMITS.name}
      shellClassName={cn('min-w-0 flex-1', className)}
    />
  )
}

export type ChoicePriceInputProps = {
  control: Control<DishFormInput>
  /** The row's `price`, e.g. `addons.2.price`. */
  name: string
  currency: string
  label: string
  className?: string
}

/**
 * What a choice adds to the dish's price. Empty means free, and says so; the
 * "+ USD" only appears once there is a price to add.
 */
export function ChoicePriceInput({
  control,
  name,
  currency,
  label,
  className,
}: ChoicePriceInputProps) {
  const { t } = useTranslation('menu')
  const { field, fieldState } = useController({ control, name: name as Path })
  const value = field.value as number | null | undefined
  const empty = value === null || value === undefined

  return (
    <Input
      ref={field.ref}
      name={field.name}
      value={value ?? ''}
      onChange={(event) => {
        const raw = event.target.value
        field.onChange(raw === '' ? null : Number(raw))
      }}
      onBlur={field.onBlur}
      aria-label={label}
      aria-invalid={Boolean(fieldState.error) || undefined}
      tone={fieldState.error ? 'error' : 'default'}
      type="number"
      inputMode="decimal"
      min={0}
      step="0.01"
      dir="ltr"
      placeholder={t('choices.free')}
      prefix={empty ? undefined : `+ ${currency}`}
      className="text-start tabular-nums"
      shellClassName={cn('w-full', className)}
    />
  )
}

export type ChoiceErrorProps = {
  control: Control<DishFormInput>
  /** The row, e.g. `variants.0`; its name, price and options are checked. */
  path: string
  languages: readonly string[]
  language: string
}

/**
 * The first thing wrong with a row, said under it. A name missing in the
 * language not on screen names that language, so the owner knows which tab
 * to open.
 */
export function ChoiceError({ control, path, languages, language }: ChoiceErrorProps) {
  const { errors } = useFormState({ control, name: path as Path })
  const message = (at: string) => (get(errors, at) as { message?: string } | undefined)?.message

  const hidden = languages.find((code) => code !== language && message(`${path}.name.${code}`))
  const text =
    message(`${path}.name.${language}`) ??
    (hidden ? `${languageName(hidden)}: ${message(`${path}.name.${hidden}`)}` : undefined) ??
    message(`${path}.price`) ??
    message(`${path}.options`) ??
    message(`${path}.options.root`)

  return text ? <HelperText tone="error">{text}</HelperText> : null
}
