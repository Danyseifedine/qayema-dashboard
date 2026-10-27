import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm, useWatch } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { TimeField } from '@/shared/components/forms/fields/time-field'

type Values = { at: string | null }

function Harness({
  initial,
  defaultMeridiem,
}: {
  initial: string | null
  defaultMeridiem?: 'am' | 'pm'
}) {
  const form = useForm<Values>({ defaultValues: { at: initial } })
  const at = useWatch({ control: form.control, name: 'at' })
  return (
    <>
      <TimeField
        control={form.control}
        name="at"
        title="Starts"
        label="Lunch starts"
        defaultMeridiem={defaultMeridiem}
      />
      <output data-testid="value">{String(at)}</output>
      <button type="button" onClick={() => form.setError('at', { message: 'Pick a time.' })}>
        Break
      </button>
    </>
  )
}

const value = () => screen.getByTestId('value').textContent

async function pick(user: ReturnType<typeof userEvent.setup>, label: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: label }))
  await user.click(screen.getByRole('option', { name: option }))
}

describe('TimeField', () => {
  it('stores what was picked as HH:MM, with the part of the day beside it', async () => {
    const user = userEvent.setup()
    render(<Harness initial="" defaultMeridiem="pm" />)

    // Minutes and PM chosen before the hour wait for it.
    await pick(user, 'Lunch starts: minutes', '30')
    expect(value()).toBe('')
    await pick(user, 'Lunch starts: hour', '6')
    expect(value()).toBe('18:30')
    expect(screen.getByText(/Evening/)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'AM' }))
    expect(value()).toBe('06:30')
  })

  it('keeps a saved time on other minutes, and reads no value as empty', async () => {
    const { unmount } = render(<Harness initial="07:20" />)
    expect(screen.getByRole('combobox', { name: 'Lunch starts: minutes' })).toHaveValue('20')
    unmount()

    render(<Harness initial={null} />)
    expect(screen.getByRole('combobox', { name: 'Lunch starts: hour' })).toHaveValue('')
  })

  it('shows its error', () => {
    render(<Harness initial="" />)
    fireEvent.click(screen.getByRole('button', { name: 'Break' }))
    return screen.findByText('Pick a time.')
  })
})
