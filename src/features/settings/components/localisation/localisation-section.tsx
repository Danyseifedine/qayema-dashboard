import { useMemo } from 'react'
import type { Control } from 'react-hook-form'
import { ComboboxField, FormSection } from '@/shared/components/forms'
import { CURRENCY_OPTIONS } from '@/shared/constants/currencies'
import type { SettingsFormValues } from '../../schemas/settings.schema'

export type LocalisationSectionProps = {
  control: Control<SettingsFormValues>
  /** Read-only: the language the owner writes in, fixed at onboarding. */
  languageName: string
}

/**
 * Every timezone this browser knows, so no 400-entry list has to ship. Older
 * browsers without `supportedValuesOf` fall back to whatever they are set to,
 * which is the right answer for the person filling the form in.
 */
function timezoneOptions(): { value: string; label: string }[] {
  const supported =
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []

  const names =
    supported.length > 0
      ? supported
      : [Intl.DateTimeFormat().resolvedOptions().timeZone, 'UTC'].filter(Boolean)

  return names.map((name) => ({ value: name, label: name.replace(/_/g, ' ') }))
}

/** Money, language and time: the three things every price and hour depends on. */
export function LocalisationSection({ control, languageName }: LocalisationSectionProps) {
  const timezones = useMemo(timezoneOptions, [])

  return (
    <FormSection title="Language, money and time" description="Applied across your whole menu.">
      <ComboboxField
        control={control}
        name="currency"
        label="Currency"
        required
        options={CURRENCY_OPTIONS}
        placeholder="Search currencies"
        emptyText="No currency matches that"
        hint="Changing this relabels existing prices; it does not convert them."
      />

      <ComboboxField
        control={control}
        name="timezone"
        label="Timezone"
        required
        options={timezones}
        placeholder="Search timezones"
        emptyText="No timezone matches that"
        hint="Used to work out whether you are open right now."
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium">Menu language</span>
        <p className="rounded-[var(--radius-control)] border-[0.5px] border-[var(--line)] bg-[var(--field)] px-3.5 py-2.5 text-[14px] text-[var(--muted)]">
          {languageName}
        </p>
        <p className="text-[12px] text-[var(--muted)]">
          Chosen when you set up your menu. Talk to us if it needs to change.
        </p>
      </div>
    </FormSection>
  )
}
