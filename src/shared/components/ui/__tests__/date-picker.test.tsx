import { createRef, useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { i18n } from '@/lib/i18n'
import { DatePicker, type DatePickerProps } from '@/shared/components/ui/date-picker'

// 2026-10-28 is a Wednesday. Only Date is faked, so user-event's timers run.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 28, 12))
})

afterEach(() => {
  vi.useRealTimers()
})

function Harness({
  initial = '',
  onChange,
  ...props
}: Partial<DatePickerProps> & { initial?: string }) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <label htmlFor="day">From</label>
      <DatePicker
        id="day"
        value={value}
        onChange={(next) => {
          setValue(next)
          onChange?.(next)
        }}
        {...props}
      />
      <output data-testid="value">{value}</output>
      <button type="button">elsewhere</button>
    </>
  )
}

const field = () => screen.getByRole('combobox', { name: 'From' })
const calendar = () => screen.getByRole('dialog', { name: 'Choose a day' })
const day = (name: string) => screen.getByRole('button', { name })
const stored = () => screen.getByTestId('value').textContent

describe('DatePicker', () => {
  it('opens on today, marked, and stores the day picked', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)

    expect(field()).toHaveAttribute('placeholder', 'Pick a day')
    expect(field()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('dialog')).toBeNull()

    await user.click(field())

    expect(field()).toHaveAttribute('aria-expanded', 'true')
    expect(field()).toHaveAttribute('aria-controls', calendar().id)
    expect(within(calendar()).getByRole('grid', { name: 'October 2026' })).toBeInTheDocument()
    const today = day('Wednesday, October 28, 2026')
    expect(today).toHaveAttribute('aria-current', 'date')
    expect(today).toHaveFocus()
    // Monday first, the full names for a screen reader.
    const heads = within(calendar()).getAllByRole('columnheader')
    expect(heads.map((head) => head.textContent)).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S'])
    expect(heads[0]).toHaveAttribute('abbr', 'Monday')

    await user.click(day('Sunday, November 1, 2026'))

    expect(onChange).toHaveBeenCalledWith('2026-11-01')
    expect(stored()).toBe('2026-11-01')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(field()).toHaveFocus()
    expect(field()).toHaveValue('Sun, Nov 1, 2026')
  })

  it('opens on the day it holds, picked, and clears it from the calendar or the field', async () => {
    const user = userEvent.setup()
    render(<Harness initial="2026-12-05" />)

    expect(field()).toHaveValue('Sat, Dec 5, 2026')
    await user.click(field())

    expect(within(calendar()).getByRole('grid', { name: 'December 2026' })).toBeInTheDocument()
    const picked = day('Saturday, December 5, 2026')
    expect(picked).toHaveFocus()
    expect(picked.closest('td')).toHaveAttribute('aria-selected', 'true')

    await user.click(within(calendar()).getByRole('button', { name: 'Clear' }))
    expect(stored()).toBe('')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(field()).toHaveValue('')
    expect(screen.queryByRole('button', { name: 'Clear the day' })).toBeNull()

    // Today, then the X in the field.
    await user.click(field())
    expect(within(calendar()).queryByRole('button', { name: 'Clear' })).toBeNull()
    await user.click(within(calendar()).getByRole('button', { name: 'Today' }))
    expect(stored()).toBe('2026-10-28')

    await user.click(screen.getByRole('button', { name: 'Clear the day' }))
    expect(stored()).toBe('')
  })

  it('moves through the month with the months buttons', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(field())
    await user.click(screen.getByRole('button', { name: 'Next month' }))
    expect(within(calendar()).getByRole('grid', { name: 'November 2026' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Previous month' }))
    await user.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(within(calendar()).getByRole('grid', { name: 'September 2026' })).toBeInTheDocument()

    // The ends of the months around are there, faint, and can be picked.
    await user.click(day('Thursday, October 1, 2026'))
    expect(stored()).toBe('2026-10-01')
  })

  it('works from the keyboard', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    field().focus()
    await user.keyboard('{Enter}')
    expect(day('Wednesday, October 28, 2026')).toHaveFocus()

    await user.keyboard('{ArrowRight}')
    expect(day('Thursday, October 29, 2026')).toHaveFocus()
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(day('Tuesday, October 27, 2026')).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(day('Tuesday, November 3, 2026')).toHaveFocus()
    expect(within(calendar()).getByRole('grid', { name: 'November 2026' })).toBeInTheDocument()
    await user.keyboard('{ArrowUp}')
    expect(day('Tuesday, October 27, 2026')).toHaveFocus()
    await user.keyboard('{End}')
    expect(day('Sunday, November 1, 2026')).toHaveFocus()
    await user.keyboard('{Home}')
    expect(day('Monday, October 26, 2026')).toHaveFocus()
    await user.keyboard('{PageDown}')
    expect(day('Thursday, November 26, 2026')).toHaveFocus()
    await user.keyboard('{PageUp}{PageUp}')
    expect(day('Saturday, September 26, 2026')).toHaveFocus()
    await user.keyboard('{Shift>}{PageDown}{/Shift}')
    expect(day('Sunday, September 26, 2027')).toHaveFocus()
    await user.keyboard('{Shift>}{PageUp}{/Shift}')
    expect(day('Saturday, September 26, 2026')).toHaveFocus()
    // Other keys leave the day alone.
    await user.keyboard('a')
    expect(day('Saturday, September 26, 2026')).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(stored()).toBe('2026-09-26')
    expect(field()).toHaveFocus()

    // Enter on an open field, then the arrow opens it too; Backspace clears.
    await user.keyboard('{ArrowDown}')
    expect(day('Saturday, September 26, 2026')).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(field()).toHaveFocus()
    await user.keyboard('{Backspace}')
    expect(stored()).toBe('')
    // Nothing to clear: Backspace does nothing more.
    await user.keyboard('{Delete}')
    expect(stored()).toBe('')
  })

  it('opens on Space and ignores Enter while open', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    field().focus()
    await user.keyboard(' ')
    expect(calendar()).toBeInTheDocument()
    fireEvent.keyDown(field(), { key: 'Enter' })
    expect(calendar()).toBeInTheDocument()
  })

  it('keeps the dialog around it open when Escape closes the calendar', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    // Closed, Escape is the dialog's.
    expect(fireEvent.keyDown(field(), { key: 'Escape' })).toBe(true)
    await user.click(field())
    expect(fireEvent.keyDown(day('Wednesday, October 28, 2026'), { key: 'Escape' })).toBe(false)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(field()).toHaveFocus()
  })

  it('swaps left and right in Arabic', async () => {
    const style = document.createElement('style')
    style.textContent = '.rtl { direction: rtl; }'
    document.head.append(style)
    onTestFinished(() => style.remove())
    const user = userEvent.setup()
    render(
      <div className="rtl">
        <Harness />
      </div>,
    )
    // jsdom inherits no direction from a parent, so the grid gets the class too.
    await user.click(field())
    screen.getByRole('grid').classList.add('rtl')

    await user.keyboard('{ArrowLeft}')
    expect(day('Thursday, October 29, 2026')).toHaveFocus()
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(day('Tuesday, October 27, 2026')).toHaveFocus()
  })

  it('offers only the days between the earliest and the latest', async () => {
    const user = userEvent.setup()
    render(<Harness min="2026-11-03" max="2026-12-10" />)

    // Today is before the earliest: it opens on the earliest.
    await user.click(field())
    expect(day('Tuesday, November 3, 2026')).toHaveFocus()
    expect(day('Monday, November 2, 2026')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Today' })).toBeDisabled()

    // The keyboard stops at either end.
    await user.keyboard('{ArrowLeft}')
    expect(day('Tuesday, November 3, 2026')).toHaveFocus()
    await user.keyboard('{PageDown}{PageDown}')
    expect(day('Thursday, December 10, 2026')).toHaveFocus()
    expect(day('Friday, December 11, 2026')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeEnabled()
  })

  it('keeps a month button open when the latest day is in the next month', async () => {
    const user = userEvent.setup()
    render(<Harness max="2026-11-01" />)

    await user.click(field())
    expect(screen.getByRole('button', { name: 'Next month' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Today' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Next month' }))
    expect(day('Sunday, November 1, 2026')).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled()
  })

  it('closes on a second press, a press outside or tabbing past it', async () => {
    const onBlur = vi.fn()
    const user = userEvent.setup()
    render(<Harness onBlur={onBlur} />)

    await user.click(field())
    await user.click(field())
    expect(screen.queryByRole('dialog')).toBeNull()

    await user.click(field())
    await user.click(screen.getByRole('button', { name: 'elsewhere' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onBlur).toHaveBeenCalled()

    // Focus leaving to nothing (a press in Safari) keeps it open.
    await user.click(field())
    fireEvent.blur(day('Wednesday, October 28, 2026'), { relatedTarget: null })
    expect(calendar()).toBeInTheDocument()
    fireEvent.blur(day('Wednesday, October 28, 2026'), {
      relatedTarget: screen.getByRole('button', { name: 'elsewhere' }),
    })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('does nothing while disabled', async () => {
    const user = userEvent.setup()
    render(<Harness initial="2026-11-01" disabled />)

    expect(field()).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Clear the day' })).toBeNull()
    fireEvent.click(field())
    fireEvent.keyDown(field(), { key: 'Enter' })
    expect(screen.queryByRole('dialog')).toBeNull()
    await user.keyboard('{Backspace}')
    expect(stored()).toBe('2026-11-01')
  })

  it('takes a placeholder, the field ids and its ref either way', () => {
    const objectRef = createRef<HTMLInputElement>()
    const callbackRef = vi.fn()
    const { unmount } = render(
      <Harness
        placeholder="From now"
        aria-describedby="hint"
        aria-invalid
        tone="error"
        inputRef={objectRef}
      />,
    )
    expect(field()).toHaveAttribute('placeholder', 'From now')
    expect(field()).toHaveAttribute('aria-describedby', 'hint')
    expect(field()).toHaveAttribute('aria-invalid', 'true')
    expect(objectRef.current).toBe(field())
    unmount()

    render(<Harness inputRef={callbackRef} />)
    expect(callbackRef).toHaveBeenCalledWith(field())
  })

  it('names the days and months in Arabic, in Western digits', async () => {
    await i18n.changeLanguage('ar')
    onTestFinished(async () => {
      await i18n.changeLanguage('en')
    })
    const user = userEvent.setup()
    render(<Harness initial="2026-11-01" />)

    expect(field()).toHaveValue(
      new Intl.DateTimeFormat('ar-u-nu-latn', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(2026, 10, 1)),
    )
    expect(field()).toHaveDisplayValue(/1.*2026/)
    await user.click(field())
    expect(screen.getByRole('dialog', { name: 'اختر يومًا' })).toBeInTheDocument()
    expect(screen.getByRole('grid')).toHaveAccessibleName(/2026/)
    expect(screen.getByRole('button', { name: 'اليوم' })).toBeInTheDocument()
  })
})
