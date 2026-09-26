import type { Control } from 'react-hook-form'
import { useController } from 'react-hook-form'
import { FormSection, TextField } from '@/shared/components/forms'
import { Switch } from '@/shared/components/ui'
import { cn } from '@/shared/utils/dom/cn'
import { WEEKDAYS, WEEKDAY_LABELS, type SettingsFormValues } from '../../schemas/settings.schema'

export type OpeningHoursSectionProps = {
  control: Control<SettingsFormValues>
}

/**
 * When the restaurant is open, one range per day.
 *
 * A closed day keeps whatever times were typed into it rather than clearing
 * them, so an owner who shuts on Mondays for a month can switch it back on
 * without retyping. Only the switch decides what is saved.
 */
export function OpeningHoursSection({ control }: OpeningHoursSectionProps) {
  return (
    <FormSection
      title="Opening hours"
      description="Shown at the top of your menu, and used to say whether you are open right now."
    >
      <div className="flex flex-col gap-2">
        {WEEKDAYS.map((day) => (
          <DayRow key={day} control={control} day={day} />
        ))}
      </div>
    </FormSection>
  )
}

function DayRow({
  control,
  day,
}: {
  control: Control<SettingsFormValues>
  day: (typeof WEEKDAYS)[number]
}) {
  const { field } = useController({ control, name: `opening_hours.${day}.closed` })
  const closed = field.value === true

  return (
    <div
      className={cn(
        'grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 rounded-[10px] px-3 py-2.5 sm:grid-cols-[120px_1fr_auto]',
        'border-[0.5px] border-[var(--line)] bg-[var(--field)]',
      )}
    >
      <span className="text-[13.5px] font-medium">{WEEKDAY_LABELS[day]}</span>

      <div
        className={cn(
          'col-span-2 flex items-center gap-2 sm:order-none sm:col-span-1',
          closed && 'opacity-45',
        )}
      >
        <TextField
          control={control}
          name={`opening_hours.${day}.open`}
          aria-label={`${WEEKDAY_LABELS[day]} opens`}
          disabled={closed}
          placeholder="09:00"
          forceLtr
          className="flex-1 pt-0"
        />
        <span aria-hidden className="text-[13px] text-[var(--muted)]">
          —
        </span>
        <TextField
          control={control}
          name={`opening_hours.${day}.close`}
          aria-label={`${WEEKDAY_LABELS[day]} closes`}
          disabled={closed}
          placeholder="22:00"
          forceLtr
          className="flex-1 pt-0"
        />
      </div>

      <label className="order-2 flex cursor-pointer items-center gap-2 text-[12.5px] text-[var(--muted)] sm:order-none">
        <Switch
          checked={!closed}
          onChange={(open) => field.onChange(!open)}
          aria-label={`${WEEKDAY_LABELS[day]} is open`}
        />
        <span className="w-12">{closed ? 'Closed' : 'Open'}</span>
      </label>
    </div>
  )
}
