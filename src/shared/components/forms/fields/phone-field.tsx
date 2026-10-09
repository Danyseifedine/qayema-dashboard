import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { Combobox, FieldShell, controlClass } from '@/shared/components/ui'
import { COUNTRIES } from '@/shared/constants/countries'
import { cn } from '@/shared/utils/dom/cn'
import { Field } from '@/shared/components/forms/layout/field'

export type PhoneFieldProps<T extends FieldValues> = {
  control: Control<T>
  /** Field holding the national number. */
  name: FieldPath<T>
  /** Field holding the ISO-3166 country code, e.g. `country_code`. */
  countryName: FieldPath<T>
  label?: ReactNode
  hint?: ReactNode
  required?: boolean
}

/**
 * Country selector and number in one shell, as `.ui-phone-wrap` in the portal.
 * The API keeps the two apart (`phone` plus `country_code`), so this writes to
 * two form fields rather than concatenating a dial code into one string.
 */
export function PhoneField<T extends FieldValues>({
  control,
  name,
  countryName,
  label,
  hint,
  required,
}: PhoneFieldProps<T>) {
  const { t } = useTranslation()
  const { field: phone, fieldState: phoneState } = useController({ control, name })
  const { field: country, fieldState: countryState } = useController({ control, name: countryName })

  // Searchable by code, dial code or country name: typing "leb", "961" or
  // "LB" all find Lebanon, which a 28-item native list could not do. The
  // name is in the dashboard's language, so "لبنان" finds it too.
  const countryNames = t('countries', { returnObjects: true }) as Record<string, string | undefined>
  const countryOptions = COUNTRIES.map((item) => ({
    value: item.code,
    label: `${item.code} ${item.dial}`,
    description: countryNames[item.code] ?? item.label,
    leading: (
      <span aria-hidden className="text-[15px]">
        {item.flag}
      </span>
    ),
  }))
  const error = phoneState.error?.message ?? countryState.error?.message

  return (
    <Field label={label} hint={hint} required={required} error={error}>
      {({ id, describedBy, invalid }) => (
        <FieldShell tone={invalid ? 'error' : 'default'}>
          <div className="flex shrink-0 items-center border-e-[0.5px] border-[var(--line)] ps-1.5">
            <Combobox
              embedded
              aria-label={t('phoneField.country')}
              name={country.name}
              inputRef={country.ref}
              value={(country.value as string) ?? null}
              onChange={(next) => country.onChange(next)}
              onBlur={country.onBlur}
              options={countryOptions}
              className="w-[132px]"
            />
          </div>
          <input
            id={id}
            name={phone.name}
            ref={phone.ref}
            value={(phone.value as string | null | undefined) ?? ''}
            onChange={(event) => phone.onChange(phoneCharacters(event.target.value))}
            onBlur={phone.onBlur}
            type="tel"
            inputMode="tel"
            dir="ltr"
            autoComplete="tel-national"
            placeholder="71 234 567"
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={cn(controlClass, 'text-start tabular-nums')}
          />
        </FieldShell>
      )}
    </Field>
  )
}

/**
 * Only what a phone number is written with, as the server accepts it
 * (UpdateRestaurantRequest): digits, spaces, + ( ) - and dots. Arabic and
 * Persian digits, from those keyboards, become 0 to 9 rather than vanish.
 */
function phoneCharacters(text: string): string {
  return text
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[^0-9+() .-]/g, '')
    .replace(/^ +/, '')
}
