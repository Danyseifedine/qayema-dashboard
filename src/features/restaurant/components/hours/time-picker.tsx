import { useState } from 'react'
import { useController, type Control } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Field } from '@/shared/components/forms'
import { Combobox, Segmented } from '@/shared/components/ui'
import type { RestaurantFormValues, Weekday } from '@/features/restaurant/schemas/restaurant.schema'
import {
  QUARTER_HOURS,
  joinTime,
  periodOf,
  splitTime,
  type Meridiem,
} from '@/features/restaurant/components/hours/time-options'

const HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1)).map((hour) => ({
  value: hour,
  label: hour,
}))

export type TimePickerProps = {
  control: Control<RestaurantFormValues>
  day: Weekday
  which: 'open' | 'close'
  /** "Opens": shown above the picker, with the part of the day beside it. */
  title: string
  /** "Monday opens": what a screen reader hears before each part. */
  label: string
  disabled: boolean
}

/**
 * One time of a day, picked the way a clock reads: the hour (1 to 12), the
 * minutes (on the quarter hour) and AM or PM, with the part of the day it
 * falls in beside it. Stored as "HH:MM" as before. A part picked before the
 * hour waits for it; a saved time on other minutes (07:20) keeps them.
 */
export function TimePicker({ control, day, which, title, label, disabled }: TimePickerProps) {
  const { t } = useTranslation('restaurant')
  const { field, fieldState } = useController({ control, name: `opening_hours.${day}.${which}` })
  const saved = splitTime(field.value)
  // What is picked before the hour has been: defaults that fit a restaurant.
  const [draft, setDraft] = useState<{ minute: string; meridiem: Meridiem }>({
    minute: '00',
    meridiem: which === 'open' ? 'am' : 'pm',
  })
  const minute = saved.minute ?? draft.minute
  const meridiem = saved.meridiem ?? draft.meridiem
  const period = periodOf(field.value)

  const set = (next: { hour?: string; minute?: string; meridiem?: Meridiem }) => {
    const hour = next.hour ?? saved.hour
    const parts = { minute: next.minute ?? minute, meridiem: next.meridiem ?? meridiem }
    setDraft(parts)
    if (hour) field.onChange(joinTime(hour, parts.minute, parts.meridiem))
  }

  const minutes = (QUARTER_HOURS as readonly string[]).includes(minute)
    ? QUARTER_HOURS
    : [...QUARTER_HOURS, minute].sort()

  return (
    <Field
      // Above the controls, not beside them: a phone needs the whole width
      // for hour, minutes and AM | PM on one line.
      label={
        <span className="normal-case tracking-normal">
          {title}
          {period && !disabled ? (
            <span className="text-[var(--muted)]"> · {t(`openingHours.periods.${period}`)}</span>
          ) : null}
        </span>
      }
      error={fieldState.error?.message}
      className="pt-0"
    >
      {({ id, describedBy, invalid }) => (
        <div className="flex items-center gap-1" dir="ltr">
          <div className="w-[62px] shrink-0">
            <Combobox
              options={HOURS}
              value={saved.hour}
              onChange={(hour) => hour && set({ hour })}
              onBlur={field.onBlur}
              inputRef={field.ref}
              id={id}
              searchable={false}
              size="sm"
              placeholder="--"
              disabled={disabled}
              aria-label={t('openingHours.hourOf', { what: label })}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              tone={invalid ? 'error' : 'default'}
            />
          </div>
          <span aria-hidden className="text-[13px] text-[var(--muted)]">
            :
          </span>
          <div className="w-[62px] shrink-0">
            <Combobox
              options={minutes.map((value) => ({ value, label: value }))}
              value={minute}
              onChange={(value) => value && set({ minute: value })}
              searchable={false}
              size="sm"
              disabled={disabled}
              aria-label={t('openingHours.minutesOf', { what: label })}
            />
          </div>
          <Segmented<Meridiem>
            size="sm"
            value={meridiem}
            onChange={(value) => set({ meridiem: value })}
            options={[
              { value: 'am', label: t('openingHours.am'), disabled },
              { value: 'pm', label: t('openingHours.pm'), disabled },
            ]}
            aria-label={t('openingHours.meridiemOf', { what: label })}
          />
        </div>
      )}
    </Field>
  )
}
