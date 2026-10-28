import { IconCalendarEvent, IconChevronLeft, IconChevronRight, IconX } from '@tabler/icons-react'
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type Ref,
} from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui/button'
import { controlClass, menuPanelClass } from '@/shared/components/ui/control-class'
import {
  FieldLeading,
  FieldShell,
  FieldTrailing,
  FieldTrailingButton,
  type FieldTone,
} from '@/shared/components/ui/field-shell'
import { floatingRoot, useAnchoredPlace } from '@/shared/hooks/use-anchored-place'
import { useDismiss } from '@/shared/hooks/use-dismiss'
import { cn } from '@/shared/utils/dom/cn'
import {
  addDays,
  addMonths,
  clampDay,
  monthGrid,
  sameMonth,
  startOfMonth,
  startOfWeek,
} from '@/shared/utils/format/calendar'
import { parseDay, todayDay, weekdayNames } from '@/shared/utils/format/date'

export type DatePickerProps = {
  /** "YYYY-MM-DD", or '' for no day. */
  value: string
  onChange: (value: string) => void
  /** The earliest day it offers, "YYYY-MM-DD". */
  min?: string
  /** The latest day it offers, "YYYY-MM-DD". */
  max?: string
  placeholder?: string
  disabled?: boolean
  tone?: FieldTone
  id?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
  onBlur?: () => void
  inputRef?: Ref<HTMLInputElement>
}

/** The panel's width, and roughly its height with its offset. */
const PANEL_WIDTH = 296
const PANEL_SPACE = 372

/** What each key does to the day in focus; left and right swap in Arabic. */
function moveBy(key: string, day: string, rtl: boolean, shift: boolean): string | null {
  switch (key) {
    case 'ArrowRight':
      return addDays(day, rtl ? -1 : 1)
    case 'ArrowLeft':
      return addDays(day, rtl ? 1 : -1)
    case 'ArrowDown':
      return addDays(day, 7)
    case 'ArrowUp':
      return addDays(day, -7)
    case 'Home':
      return startOfWeek(day)
    case 'End':
      return addDays(startOfWeek(day), 6)
    case 'PageUp':
      return addMonths(day, shift ? -12 : -1)
    case 'PageDown':
      return addMonths(day, shift ? 12 : 1)
    default:
      return null
  }
}

/**
 * A calendar day, picked on a calendar of our own rather than the browser's
 * (which looks different on every phone and cannot be styled): the field
 * shows the day in words in the dashboard's language, and opens a month
 * under it, Monday first, with today marked, the days outside `min` and
 * `max` closed, and Today and Clear at its foot. The keyboard moves by day
 * and week with the arrows (mirrored in Arabic), by month with Page Up and
 * Page Down (a year with Shift), and to the week's ends with Home and End;
 * Escape closes it and gives the focus back to the field.
 */
export function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder,
  disabled = false,
  tone = 'default',
  id,
  onBlur,
  inputRef,
  ...aria
}: DatePickerProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const panelId = useId()
  const headingId = useId()
  const container = useRef<HTMLDivElement>(null)
  const shell = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement | null>(null)
  const grid = useRef<HTMLTableElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  // Set when the focus should follow the day in focus on the next render.
  const focusDay = useRef(false)
  const [open, setOpen] = useState(false)
  const today = todayDay()
  // The day the keyboard is on; its month is the one shown.
  const [focused, setFocused] = useState(() => clampDay(value || today, min, max))
  const place = useAnchoredPlace(open, shell, {
    width: PANEL_WIDTH,
    height: PANEL_SPACE,
    alignEnd: true,
    matchWidth: false,
  })

  const formats = useMemo(() => {
    // Western digits in Arabic too, as everywhere in the dashboard.
    const tag = `${locale}-u-nu-latn`
    return {
      field: new Intl.DateTimeFormat(tag, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      month: new Intl.DateTimeFormat(tag, { month: 'long', year: 'numeric' }),
      day: new Intl.DateTimeFormat(tag, { dateStyle: 'full' }),
      narrow: weekdayNames(locale, 'narrow'),
      long: weekdayNames(locale, 'long'),
    }
  }, [locale])

  // A press outside unmounts the day in focus, which then never blurs: the
  // owner has still been through the field.
  const dismiss = useCallback(() => {
    setOpen(false)
    onBlur?.()
  }, [onBlur])
  useDismiss({ open, onDismiss: dismiss, container, trigger: input, panel })

  // Opening, and moving with the keyboard, puts the focus on the day.
  useEffect(() => {
    if (!open || !focusDay.current) return
    focusDay.current = false
    grid.current?.querySelector<HTMLButtonElement>(`[data-day="${focused}"]`)?.focus()
  }, [open, focused])

  const allowed = (day: string) => clampDay(day, min, max) === day

  const show = () => {
    if (disabled) return
    setFocused(clampDay(value || today, min, max))
    focusDay.current = true
    setOpen(true)
  }

  const pick = (day: string) => {
    onChange(day)
    setOpen(false)
    input.current?.focus()
  }

  const goToMonth = (count: number) => setFocused(clampDay(addMonths(focused, count), min, max))

  const onFieldKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (['ArrowDown', 'Enter', ' '].includes(event.key) && !open) {
      event.preventDefault()
      show()
    } else if ((event.key === 'Backspace' || event.key === 'Delete') && value) {
      event.preventDefault()
      onChange('')
    }
  }

  const onGridKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl'
    const next = moveBy(event.key, focused, rtl, event.shiftKey)
    if (next === null) return
    event.preventDefault()
    focusDay.current = true
    setFocused(clampDay(next, min, max))
  }

  const onContainerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Escape closes the calendar (useDismiss) without also closing the
    // dialog it may sit in, whose native cancel is swallowed here.
    if (event.key === 'Escape' && open) event.preventDefault()
  }

  const onContainerBlur = (event: FocusEvent<HTMLDivElement>) => {
    const to = event.relatedTarget as Node | null
    if (to && (container.current?.contains(to) || panel.current?.contains(to))) return
    onBlur?.()
    // Tabbing on past the calendar closes it. A press on it in Safari, which
    // does not focus buttons, blurs to nothing and must keep it open.
    if (to) setOpen(false)
  }

  const setInputRef = (element: HTMLInputElement | null) => {
    input.current = element
    if (typeof inputRef === 'function') inputRef(element)
    else if (inputRef) inputRef.current = element
  }

  const weeks = monthGrid(focused)
  const prevDisabled = Boolean(min && startOfMonth(focused) <= min)
  const nextDisabled = Boolean(max && startOfMonth(addMonths(startOfMonth(focused), 1)) > max)

  return (
    <div
      ref={container}
      className="relative"
      onKeyDown={onContainerKeyDown}
      onBlur={onContainerBlur}
    >
      <div ref={shell}>
        <FieldShell tone={tone} disabled={disabled}>
          <FieldLeading>
            <IconCalendarEvent aria-hidden />
          </FieldLeading>
          <input
            ref={setInputRef}
            id={id}
            type="text"
            role="combobox"
            readOnly
            disabled={disabled}
            value={value ? formats.field.format(parseDay(value)) : ''}
            placeholder={placeholder ?? t('datePicker.placeholder')}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={open ? panelId : undefined}
            onClick={() => (open ? setOpen(false) : show())}
            onKeyDown={onFieldKeyDown}
            className={cn(controlClass, 'cursor-pointer ps-1', value && 'pe-0')}
            {...aria}
          />
          {value && !disabled ? (
            <FieldTrailing>
              <FieldTrailingButton label={t('datePicker.clearDay')} onClick={() => pick('')}>
                <IconX aria-hidden />
              </FieldTrailingButton>
            </FieldTrailing>
          ) : null}
        </FieldShell>
      </div>

      {open
        ? createPortal(
        <div
          ref={panel}
          id={panelId}
          role="dialog"
          aria-label={t('datePicker.choose')}
          style={place}
          className={cn('fixed z-50 w-[min(296px,calc(100vw-32px))] p-3', menuPanelClass)}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('datePicker.previousMonth')}
              disabled={prevDisabled}
              onClick={() => goToMonth(-1)}
            >
              <IconChevronLeft aria-hidden className="size-4 rtl:rotate-180" />
            </Button>
            <div
              id={headingId}
              aria-live="polite"
              className="text-[14px] font-medium text-[var(--text)]"
            >
              {formats.month.format(parseDay(focused))}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('datePicker.nextMonth')}
              disabled={nextDisabled}
              onClick={() => goToMonth(1)}
            >
              <IconChevronRight aria-hidden className="size-4 rtl:rotate-180" />
            </Button>
          </div>

          <table
            ref={grid}
            role="grid"
            aria-labelledby={headingId}
            onKeyDown={onGridKeyDown}
            className="w-full table-fixed border-collapse"
          >
            <thead>
              <tr>
                {formats.narrow.map((name, index) => (
                  <th
                    key={formats.long[index]}
                    scope="col"
                    abbr={formats.long[index]}
                    className="pb-1 text-[11.5px] font-medium text-[var(--muted)]"
                  >
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={week[0]}>
                  {week.map((day) => {
                    const selected = day === value
                    const isToday = day === today
                    return (
                      <td
                        key={day}
                        role="gridcell"
                        aria-selected={selected}
                        className="p-0.5 text-center"
                      >
                        <button
                          type="button"
                          data-day={day}
                          tabIndex={day === focused ? 0 : -1}
                          disabled={!allowed(day)}
                          aria-label={formats.day.format(parseDay(day))}
                          aria-current={isToday ? 'date' : undefined}
                          onClick={() => pick(day)}
                          className={cn(
                            'focus-ring mx-auto grid size-9 place-items-center rounded-tile text-[13px] tabular-nums transition-colors',
                            'enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-30',
                            selected
                              ? 'bg-gold font-semibold text-ink hover:bg-gold-deep'
                              : 'enabled:hover:bg-[var(--hover-wash)]',
                            // Today wears a gold ring; the other months' days are faint.
                            !selected &&
                              (isToday
                                ? 'font-semibold text-accent ring-[0.5px] ring-accent-border ring-inset'
                                : sameMonth(day, focused)
                                  ? 'text-[var(--text)]'
                                  : 'text-[var(--placeholder)]'),
                          )}
                        >
                          {parseDay(day).getDate()}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-2 flex items-center justify-between gap-2 border-t-[0.5px] border-[var(--line)] pt-2">
            <Button variant="ghost" size="xs" disabled={!allowed(today)} onClick={() => pick(today)}>
              {t('datePicker.today')}
            </Button>
            {value ? (
              <Button
                variant="ghost"
                size="xs"
                className="text-[var(--muted)]"
                onClick={() => pick('')}
              >
                {t('datePicker.clear')}
              </Button>
            ) : null}
          </div>
        </div>,
            floatingRoot(container.current),
          )
        : null}
    </div>
  )
}
