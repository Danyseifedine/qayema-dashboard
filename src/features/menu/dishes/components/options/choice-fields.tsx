import {
  get,
  useController,
  useFormState,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { HelperText, Input } from '@/shared/components/ui'
import { languageDir, languageName } from '@/shared/constants/menu-languages'
import { cn } from '@/shared/utils/dom/cn'
import { MENU_TEXT_LIMITS } from '@/shared/constants/menu-text-limits'
export type ChoiceNameInputProps<T extends FieldValues> = {
  control: Control<T>
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
export function ChoiceNameInput<T extends FieldValues>({
  control,
  name,
  language,
  label,
  placeholder,
  className,
}: ChoiceNameInputProps<T>) {
  const { field, fieldState } = useController({
    control,
    name: `${name}.${language}` as FieldPath<T>,
  })

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
      maxLength={MENU_TEXT_LIMITS.choiceName}
      shellClassName={cn('min-w-0 flex-1', className)}
    />
  )
}

export type ChoicePriceInputProps<T extends FieldValues> = {
  control: Control<T>
  /** The row's `price`, e.g. `addons.2.price`. */
  name: string
  currency: string
  label: string
  /** A full price (an option of a dish with no price of its own), not an extra. */
  full?: boolean
  /** What an empty box means, in place of "Free" (a part's automatic share). */
  placeholder?: string
  className?: string
}

/**
 * What a choice adds to the dish's price. Empty means free, and says so; the
 * "+ USD" only appears once there is a price to add. A full price reads
 * "USD", never "+": it is the price, not something on top.
 */
export function ChoicePriceInput<T extends FieldValues>({
  control,
  name,
  currency,
  label,
  full = false,
  placeholder,
  className,
}: ChoicePriceInputProps<T>) {
  const { t } = useTranslation('menu')
  const { field, fieldState } = useController({ control, name: name as FieldPath<T> })
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
      placeholder={placeholder ?? (full ? '0.00' : t('choices.free'))}
      prefix={full ? currency : empty ? undefined : `+ ${currency}`}
      className="text-start tabular-nums"
      shellClassName={cn('w-full', className)}
    />
  )
}

export type ChoiceErrorProps<T extends FieldValues> = {
  control: Control<T>
  /** The row, e.g. `variants.0`; its name, price and options are checked. */
  path: string
  languages: readonly string[]
  language: string
  /** More of the row's fields to check after its price, e.g. a build's `part_prices.2`. */
  more?: readonly string[]
}

/** No more fields to check, one list for every render. */
const NO_MORE: readonly string[] = []

/**
 * The first thing wrong with a row, said under it. A name missing in the
 * language not on screen names that language, so the owner knows which tab
 * to open.
 */
export function ChoiceError<T extends FieldValues>({
  control,
  path,
  languages,
  language,
  more = NO_MORE,
}: ChoiceErrorProps<T>) {
  const { errors } = useFormState({ control, name: path as FieldPath<T> })
  const message = (at: string) => (get(errors, at) as { message?: string } | undefined)?.message

  const hidden = languages.find((code) => code !== language && message(`${path}.name.${code}`))
  const text =
    message(`${path}.name.${language}`) ??
    (hidden ? `${languageName(hidden)}: ${message(`${path}.name.${hidden}`)}` : undefined) ??
    message(`${path}.price`) ??
    message(`${path}.options`) ??
    message(`${path}.options.root`) ??
    more.map((field) => message(`${path}.${field}`)).find(Boolean)

  return text ? <HelperText tone="error">{text}</HelperText> : null
}
