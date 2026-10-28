import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm, useWatch } from 'react-hook-form'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DateField } from '@/shared/components/forms/fields/date-field'

type Values = { day: string | null }

// 2026-10-28; only Date is faked, so user-event's timers run.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 28, 12))
})

afterEach(() => {
  vi.useRealTimers()
})

function Harness({ initial }: { initial: string | null }) {
  const form = useForm<Values>({ defaultValues: { day: initial } })
  const day = useWatch({ control: form.control, name: 'day' })
  return (
    <>
      <DateField
        control={form.control}
        name="day"
        label="From"
        hint="Empty: from now."
        min="2026-10-20"
        max="2026-12-31"
      />
      <output data-testid="value">{String(day)}</output>
      <button type="button" onClick={() => form.setError('day', { message: 'Too early.' })}>
        Break
      </button>
      <button type="button" onClick={() => form.setFocus('day')}>
        Focus
      </button>
    </>
  )
}

const field = () => screen.getByRole('combobox', { name: 'From' })

describe('DateField', () => {
  it('stores the day picked on the calendar and clears to empty', async () => {
    const user = userEvent.setup()
    render(<Harness initial="" />)
    expect(field()).toHaveAccessibleDescription('Empty: from now.')

    await user.click(field())
    expect(screen.getByRole('button', { name: 'Monday, October 19, 2026' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Sunday, November 1, 2026' }))
    expect(screen.getByTestId('value')).toHaveTextContent('2026-11-01')
    expect(field()).toHaveValue('Sun, Nov 1, 2026')

    await user.click(screen.getByRole('button', { name: 'Clear the day' }))
    expect(screen.getByTestId('value')).toHaveTextContent('')
  })

  it('reads no value as empty, shows its error and takes the focus from the form', async () => {
    render(<Harness initial={null} />)
    expect(field()).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: 'Break' }))
    expect(await screen.findByText('Too early.')).toBeInTheDocument()
    expect(field()).toHaveAttribute('aria-invalid', 'true')
    expect(field()).toHaveAccessibleDescription('Too early.')

    // The form focuses a field on its next turn.
    fireEvent.click(screen.getByRole('button', { name: 'Focus' }))
    await waitFor(() => expect(field()).toHaveFocus())
  })
})
