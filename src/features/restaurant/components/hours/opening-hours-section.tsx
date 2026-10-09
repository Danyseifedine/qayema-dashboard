import { IconPlus, IconX } from '@tabler/icons-react'
import type { Control } from 'react-hook-form'
import { useController, useFieldArray, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FormSection } from '@/shared/components/forms'
import { Button, Switch } from '@/shared/components/ui'
import {
  WEEKDAYS,
  weekdayLabel,
  type RestaurantFormValues,
  type Weekday,
} from '@/features/restaurant/schemas/restaurant.schema'
import {
  MAX_SHIFTS,
  nextShift,
  runsPastMidnight,
} from '@/features/restaurant/components/hours/time-options'
import { TimePicker } from '@/features/restaurant/components/hours/time-picker'

export type OpeningHoursSectionProps = {
  control: Control<RestaurantFormValues>
}

/**
 * When the restaurant is open: one shift per day, or up to MAX_SHIFTS for a
 * day it closes in the afternoon and opens again for dinner.
 *
 * Each time is picked like a clock reads it (TimePicker: hour, minutes,
 * AM or PM), with the part of the day beside it, and a day whose last shift
 * closes after midnight says so. A closed day keeps whatever shifts it had
 * rather than clearing them, so an owner who shuts on Mondays for a month
 * can switch it back on without picking again. Only the switch decides what
 * is saved.
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
  const shifts = useFieldArray({ control, name: `opening_hours.${day}.shifts` })
  const picked = useWatch({ control, name: `opening_hours.${day}.shifts` })
  const closed = field.value === true
  const label = weekdayLabel(day)
  const split = shifts.fields.length > 1
  const last = picked.at(-1)

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

      {shifts.fields.map((shift, index) => {
        const number = index + 1
        return (
          <div
            key={shift.id}
            className={
              split ? 'flex flex-col gap-2 border-t-[0.5px] border-[var(--line)] pt-2' : ''
            }
          >
            {split ? (
              <div className="flex min-h-9 items-center justify-between gap-2">
                <span className="text-[12px] font-medium text-[var(--muted)]">
                  {t('openingHours.shift', { number })}
                </span>
                {index > 0 && !closed ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('openingHours.removeShift', { number, day: label })}
                    onClick={() => shifts.remove(index)}
                    className="size-9"
                  >
                    <IconX aria-hidden className="size-4" />
                  </Button>
                ) : null}
              </div>
            ) : null}
            {/* One under the other: side by side they would not fit the card.
                A closed day keeps its times greyed, so turning it back on
                restores them. */}
            <div className="flex flex-col gap-3">
              <TimePicker
                control={control}
                day={day}
                shift={index}
                which="open"
                title={t('openingHours.opens')}
                label={
                  split
                    ? t('openingHours.shiftOpens', { day: label, number })
                    : t('openingHours.dayOpens', { day: label })
                }
                disabled={closed}
              />
              <TimePicker
                control={control}
                day={day}
                shift={index}
                which="close"
                title={t('openingHours.closes')}
                label={
                  split
                    ? t('openingHours.shiftCloses', { day: label, number })
                    : t('openingHours.dayCloses', { day: label })
                }
                disabled={closed}
              />
            </div>
          </div>
        )
      })}

      {!closed && last && runsPastMidnight(last.open, last.close) ? (
        <p className="text-[12px] text-[var(--muted)]">{t('openingHours.pastMidnight')}</p>
      ) : null}

      {!closed && shifts.fields.length < MAX_SHIFTS ? (
        <div>
          <Button
            variant="ghost"
            size="sm"
            leadingIcon={<IconPlus aria-hidden className="size-4" />}
            aria-label={t('openingHours.addShiftOn', { day: label })}
            onClick={() => shifts.append(nextShift(last))}
          >
            {t('openingHours.addShift')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
