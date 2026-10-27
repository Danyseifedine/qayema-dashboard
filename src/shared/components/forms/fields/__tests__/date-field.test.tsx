import { fireEvent, render, screen } from '@testing-library/react'
import { useForm, useWatch } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { DateField } from '@/shared/components/forms/fields/date-field'

type Values = { day: string | null }

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
        min="2026-01-01"
      />
      <output data-testid="value">{String(day)}</output>
      <button type="button" onClick={() => form.setError('day', { message: 'Too early.' })}>
        Break
      </button>
    </>
  )
}

describe('DateField', () => {
  it('stores the day picked and clears to empty', () => {
    render(<Harness initial="" />)
    const input = screen.getByLabelText('From')
    expect(input).toHaveAttribute('type', 'date')
    expect(input).toHaveAttribute('min', '2026-01-01')

    fireEvent.change(input, { target: { value: '2026-11-01' } })
    expect(screen.getByTestId('value')).toHaveTextContent('2026-11-01')

    fireEvent.change(input, { target: { value: '' } })
    expect(screen.getByTestId('value')).toHaveTextContent('')
  })

  it('reads no value as empty and shows its error', async () => {
    render(<Harness initial={null} />)
    expect(screen.getByLabelText('From')).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: 'Break' }))
    expect(await screen.findByText('Too early.')).toBeInTheDocument()
  })
})
