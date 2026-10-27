import { IconPlus, IconX } from '@tabler/icons-react'
import { useController, useFieldArray, useWatch, type Control } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { DateField, Field, FieldGroup, SwitchField, TimeField } from '@/shared/components/forms'
import { Button, HelperText, Segmented, ToggleChip } from '@/shared/components/ui'
import { runsPastMidnight } from '@/shared/utils/format/clock'
import { weekdayNames } from '@/shared/utils/format/date'
import { usePreferencesStore } from '@/stores/preferences.store'
import {
  MAX_WINDOWS,
  REPEATS,
  WEEKDAYS,
  toOfferPayload,
  type OfferFormValues,
} from '@/features/offers/schemas/offer.schema'
import { useOfferParts } from '@/features/offers/hooks/use-offer-parts'
import { scheduleSummary } from '@/features/offers/utils/offer-schedule'

const MONTH_DAYS = Array.from({ length: 31 }, (_, index) => index + 1)

export type ScheduleSectionProps = {
  control: Control<OfferFormValues>
  /** The restaurant's timezone, which every time here is in. */
  timezone: string
}

/**
 * When the offer runs: always, or on a schedule made of its first and last
 * day (either may be left open), the days it repeats on (every day, some
 * weekdays, some days of the month) and the times of day (all day, or up to
 * three, the last allowed past midnight), said back as one sentence.
 */
export function ScheduleSection({ control, timezone }: ScheduleSectionProps) {
  const { t } = useTranslation('offers')
  // Days, times and the sentence are said in the dashboard's language.
  const locale = usePreferencesStore((state) => state.locale)
  const parts = useOfferParts()
  const when = useController({ control, name: 'when' })
  const repeat = useController({ control, name: 'repeat' })
  const weekdays = useController({ control, name: 'weekdays' })
  const monthDays = useController({ control, name: 'month_days' })
  const windows = useFieldArray({ control, name: 'time_windows' })
  const values = useWatch({ control }) as OfferFormValues
  const names = weekdayNames(locale, 'short')
  const longNames = weekdayNames(locale, 'long')
  const last = values.time_windows?.[values.time_windows.length - 1]

  const toggleIn = <T,>(list: readonly T[], item: T): T[] =>
    list.includes(item) ? list.filter((other) => other !== item) : [...list, item]

  return (
    <div className="flex flex-col gap-3">
      <Segmented<'always' | 'custom'>
        block
        value={when.field.value}
        onChange={when.field.onChange}
        aria-label={t('editor.when')}
        options={[
          { value: 'always', label: t('editor.whenOptions.always') },
          {
            value: 'custom',
            label: t('editor.whenOptions.custom'),
            // Without schedules on the package, an offer is always on.
            disabled: !parts.schedules && when.field.value !== 'custom',
          },
        ]}
      />
      {parts.schedules ? null : (
        <HelperText tone="warning" role="status">
          {t('editor.schedulesOff')}
        </HelperText>
      )}

      {when.field.value === 'custom' ? (
        <>
          <FieldGroup>
            <div className="flex flex-col gap-2">
              <DateField
                control={control}
                name="starts_on"
                label={t('editor.from')}
                hint={t('editor.fromHint')}
                optionalText={t('editor.optional')}
              />
              {values.starts_on ? (
                <TimeField
                  control={control}
                  name="starts_time"
                  title={t('editor.time')}
                  label={t('editor.from')}
                />
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <DateField
                control={control}
                name="ends_on"
                label={t('editor.until')}
                hint={t('editor.untilHint')}
                optionalText={t('editor.optional')}
                min={values.starts_on || undefined}
              />
              {values.ends_on ? (
                <TimeField
                  control={control}
                  name="ends_time"
                  title={t('editor.time')}
                  label={t('editor.until')}
                  defaultMeridiem="pm"
                />
              ) : null}
            </div>
          </FieldGroup>

          <Field label={t('editor.repeat')}>
            {() => (
              <Segmented<OfferFormValues['repeat']>
                block
                value={repeat.field.value}
                onChange={repeat.field.onChange}
                aria-label={t('editor.repeat')}
                options={REPEATS.map((option) => ({
                  value: option,
                  label: t(`editor.repeatOptions.${option}`),
                }))}
              />
            )}
          </Field>

          {repeat.field.value === 'weekly' ? (
            <Field label={t('editor.weekdays')} error={weekdays.fieldState.error?.message}>
              {() => (
                <div
                  role="group"
                  aria-label={t('editor.weekdays')}
                  className="flex flex-wrap gap-1.5"
                >
                  {WEEKDAYS.map((day, index) => (
                    <ToggleChip
                      key={day}
                      on={weekdays.field.value.includes(day)}
                      title={longNames[index]}
                      onClick={() => weekdays.field.onChange(toggleIn(weekdays.field.value, day))}
                    >
                      {names[index]}
                    </ToggleChip>
                  ))}
                </div>
              )}
            </Field>
          ) : null}

          {repeat.field.value === 'monthly' ? (
            <Field
              label={t('editor.monthDays')}
              hint={t('editor.monthDaysHint')}
              error={monthDays.fieldState.error?.message}
            >
              {() => (
                <div
                  role="group"
                  aria-label={t('editor.monthDays')}
                  className="flex flex-wrap gap-1.5"
                  dir="ltr"
                >
                  {MONTH_DAYS.map((day) => (
                    <ToggleChip
                      key={day}
                      on={monthDays.field.value.includes(day)}
                      onClick={() => monthDays.field.onChange(toggleIn(monthDays.field.value, day))}
                    >
                      {day}
                    </ToggleChip>
                  ))}
                </div>
              )}
            </Field>
          ) : null}

          <SwitchField
            control={control}
            name="all_day"
            label={t('editor.allDay')}
            description={t('editor.allDayDescription')}
          />

          {!values.all_day ? (
            <div className="flex flex-col gap-3">
              {windows.fields.map((window, index) => {
                const number = index + 1
                return (
                  <div key={window.id} className="inset-tile flex flex-col gap-2 rounded-tile p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium">
                        {t('editor.window', { number })}
                      </span>
                      {windows.fields.length > 1 ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t('editor.removeWindow', { number })}
                          onClick={() => windows.remove(index)}
                        >
                          <IconX aria-hidden className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <TimeField
                        control={control}
                        name={`time_windows.${index}.from`}
                        title={t('editor.starts')}
                        label={t('editor.windowStarts', { number })}
                        defaultMeridiem="pm"
                      />
                      <TimeField
                        control={control}
                        name={`time_windows.${index}.to`}
                        title={t('editor.ends')}
                        label={t('editor.windowEnds', { number })}
                        defaultMeridiem="pm"
                      />
                    </div>
                  </div>
                )
              })}
              {last && runsPastMidnight(last.from, last.to) ? (
                <HelperText>{t('editor.pastMidnight')}</HelperText>
              ) : null}
              {windows.fields.length < MAX_WINDOWS ? (
                <Button
                  variant="ghost"
                  className="self-start"
                  leadingIcon={<IconPlus className="size-4" />}
                  onClick={() => windows.append({ from: '', to: '' })}
                >
                  {t('editor.addWindow')}
                </Button>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      <p className="rounded-tile bg-accent-wash px-3 py-2 text-[13px] leading-snug">
        {t('editor.summary', { summary: scheduleSummary(toOfferPayload(values), locale) })}
        <span className="mt-0.5 block text-[11.5px] text-[var(--muted)]">
          {t('page.timezone', { timezone })}
        </span>
      </p>
    </div>
  )
}
