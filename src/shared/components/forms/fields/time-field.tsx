import { useState, type ReactNode } from 'react'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Field } from '@/shared/components/forms/layout/field'
import { Combobox, Segmented } from '@/shared/components/ui'
import {
  QUARTER_HOURS,
  joinTime,
  periodOf,
  splitTime,
  type Meridiem,
} from '@/shared/utils/format/clock'

const HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1)).map((hour) => ({
  value: hour,
  label: hour,
}))

export type TimeFieldProps<T extends FieldValues> = {
  control: Control<T>
  /** A field holding "HH:MM" (or '' before one is picked). */
  name: FieldPath<T>
  /** "Opens": shown above the picker, with the part of the day beside it. */
  title: ReactNode
  /** "Monday opens": what a screen reader hears before each part. */
  label: string
  /** AM or PM before anything is picked: a closing time starts on PM. */
  defaultMeridiem?: Meridiem
}

/**
 * One time of a day, picked the way a clock reads: the hour (1 to 12), the
 * minutes (on the quarter hour) and AM or PM, with the part of the day it
 * falls in beside it, stored as "HH:MM". A part picked before the hour
 * waits for it; a saved time on other minutes (07:20) keeps them. The
 * opening hours' shifts and an offer's time windows use it.
 */
export function TimeField<T extends FieldValues>({
  control,
  name,
  title,
  label,
  defaultMeridiem = 'am',
}: TimeFieldProps<T>) {
  const { t } = useTranslation()
  const { field, fieldState } = useController({ control, name })
  const value = typeof field.value === 'string' ? field.value : ''
  const saved = splitTime(value)
  // What is picked before the hour has been.
  const [draft, setDraft] = useState<{ minute: string; meridiem: Meridiem }>({
    minute: '00',
    meridiem: defaultMeridiem,
  })
  const minute = saved.minute ?? draft.minute
  const meridiem = saved.meridiem ?? draft.meridiem
  const period = periodOf(value)

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
          {period ? (
            <span className="text-[var(--muted)]"> · {t(`time.periods.${period}`)}</span>
          ) : null}
        </span>
      }
      error={fieldState.error?.message}
      className="pt-0"
    >
      {({ id, describedBy, invalid }) => (
        // Read left to right like a clock in every language, but kept on the
        // reading side, under its label, in Arabic too.
        <div className="flex items-center gap-1 self-start" dir="ltr">
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
              aria-label={t('time.hourOf', { what: label })}
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
              options={minutes.map((option) => ({ value: option, label: option }))}
              value={minute}
              placeholder="00"
              onChange={(option) => option && set({ minute: option })}
              searchable={false}
              size="sm"
              aria-label={t('time.minutesOf', { what: label })}
            />
          </div>
          <Segmented<Meridiem>
            size="sm"
            value={meridiem}
            onChange={(option) => set({ meridiem: option })}
            options={[
              { value: 'am', label: t('time.am') },
              { value: 'pm', label: t('time.pm') },
            ]}
            aria-label={t('time.meridiemOf', { what: label })}
          />
        </div>
      )}
    </Field>
  )
}
