import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm, useWatch } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { PriceField } from '@/shared/components/forms/fields/price-field'

type Values = { price: number | null }

function Harness({ initial = null, hint }: { initial?: number | null; hint?: string }) {
  const form = useForm<Values>({ defaultValues: { price: initial } })
  const price = useWatch({ control: form.control, name: 'price' })
  return (
    <>
      <PriceField control={form.control} name="price" currency="USD" label="Price" hint={hint} />
      <output data-testid="value">{JSON.stringify(price)}</output>
      <button type="button" onClick={() => form.setError('price', { message: 'Too low.' })}>
        Break
      </button>
    </>
  )
}

const box = () => screen.getByRole('spinbutton', { name: /Price/ })
const stored = () => screen.getByTestId('value').textContent

describe('PriceField', () => {
  it('shows the currency before an empty box', () => {
    render(<Harness />)

    expect(screen.getByText('USD')).toBeInTheDocument()
    expect(box()).toHaveValue(null)
    expect(box()).toHaveAttribute('placeholder', '0.00')
    expect(box()).toHaveAttribute('dir', 'ltr')
  })

  it('shows a saved price', () => {
    render(<Harness initial={12.5} />)

    expect(box()).toHaveValue(12.5)
  })

  it('hands the form a number, not the text', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(box(), '7.25')

    expect(stored()).toBe('7.25')
  })

  it('stores null when the box is emptied', async () => {
    const user = userEvent.setup()
    render(<Harness initial={4} />)

    await user.clear(box())

    expect(stored()).toBe('null')
  })

  it('shows its hint', () => {
    render(<Harness hint="Before tax." />)

    expect(box()).toHaveAccessibleDescription('Before tax.')
  })

  it('shows its error and marks itself invalid', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Break' }))

    expect(await screen.findByText('Too low.')).toBeInTheDocument()
    expect(box()).toHaveAttribute('aria-invalid', 'true')
  })
})
