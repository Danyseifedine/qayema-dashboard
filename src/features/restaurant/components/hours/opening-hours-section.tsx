import type { Control } from 'react-hook-form'
import { useController, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FormSection } from '@/shared/components/forms'
import { Switch } from '@/shared/components/ui'
import {
  WEEKDAYS,
  weekdayLabel,
  type RestaurantFormValues,
  type Weekday,
} from '@/features/restaurant/schemas/restaurant.schema'
import { runsPastMidnight } from '@/features/restaurant/components/hours/time-options'
import { TimePicker } from '@/features/restaurant/components/hours/time-picker'

export type OpeningHoursSectionProps = {
  control: Control<RestaurantFormValues>
}

/**
 * When the restaurant is open, one range per day.
 *
 * Each time is picked like a clock reads it (TimePicker: hour, minutes,
 * AM or PM), with the part of the day beside it, and a day that closes
 * after midnight says so. A closed day keeps whatever times it had rather
 * than clearing them, so an owner who shuts on Mondays for a month can
 * switch it back on without picking again. Only the switch decides what is
 * saved.
 */
export function OpeningHoursSection({ control }: OpeningHoursSectionProps) {
  const { t } = useTranslation('restaurant')

  return (
    <FormSection title={t('openingHours.title')} description={t('openingHours.description')}>
      <div className="flex flex-col gap-2">
        {WEEKDAYS.map((day) => (
          <DayRow key={day} control={control} day={day} />
        ))}
      </div>
    </FormSection>
  )
}

function DayRow({ control, day }: { control: Control<RestaurantFormValues>; day: Weekday }) {
  const { t } = useTranslation('restaurant')
  const { field } = useController({ control, name: `opening_hours.${day}.closed` })
  const closed = field.value === true
  const label = weekdayLabel(day)
  const [opensAt, closesAt] = useWatch({
    control,
    name: [`opening_hours.${day}.open`, `opening_hours.${day}.close`],
  })

  return (
    <div className="flex flex-col gap-2 rounded-[10px] border-[0.5px] border-[var(--line)] bg-[var(--field)] px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13.5px] font-medium">{label}</span>
        <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-[var(--muted)]">
          <Switch
            checked={!closed}
            onChange={(open) => field.onChange(!open)}
            aria-label={t('openingHours.dayIsOpen', { day: label })}
          />
          <span className="w-12">{closed ? t('openingHours.closed') : t('openingHours.open')}</span>
        </label>
      </div>

      {/* One under the other: side by side they would not fit the card. A
          closed day keeps its times greyed, so turning it back on restores them. */}
      <div className="flex flex-col gap-3">
        <TimePicker
          control={control}
          day={day}
          which="open"
          title={t('openingHours.opens')}
          label={t('openingHours.dayOpens', { day: label })}
          disabled={closed}
        />
        <TimePicker
          control={control}
          day={day}
          which="close"
          title={t('openingHours.closes')}
          label={t('openingHours.dayCloses', { day: label })}
          disabled={closed}
        />
      </div>

      {!closed && runsPastMidnight(opensAt, closesAt) ? (
        <p className="text-[12px] text-[var(--muted)]">{t('openingHours.pastMidnight')}</p>
      ) : null}
    </div>
  )
}
