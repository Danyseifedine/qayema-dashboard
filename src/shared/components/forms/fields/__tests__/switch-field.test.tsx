import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm, useWatch } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { SwitchField } from '@/shared/components/forms/fields/switch-field'

type Values = { available?: boolean }

function Harness({
  initial,
  description,
  disabled,
}: {
  initial?: boolean
  description?: string
  disabled?: boolean
}) {
  const form = useForm<Values>({ defaultValues: { available: initial } })
  const available = useWatch({ control: form.control, name: 'available' })
  return (
    <>
      <SwitchField
        control={form.control}
        name="available"
        label="Available"
        description={description}
        disabled={disabled}
        className="mt-2"
      />
      <output data-testid="value">{String(available)}</output>
      <button type="button" onClick={() => form.setError('available', { message: 'Nope.' })}>
        Break
      </button>
    </>
  )
}

const control = () => screen.getByRole('switch', { name: 'Available' })

describe('SwitchField', () => {
  it('reads an unset value as off', () => {
    render(<Harness />)

    expect(control()).toHaveAttribute('aria-checked', 'false')
    expect(control()).not.toHaveAttribute('aria-describedby')
  })

  it('toggles the form value', async () => {
    const user = userEvent.setup()
    render(<Harness initial />)

    expect(control()).toHaveAttribute('aria-checked', 'true')
    await user.click(control())

    expect(screen.getByTestId('value')).toHaveTextContent('false')
    expect(control()).toHaveAttribute('aria-checked', 'false')
  })

  it('is described by its description', () => {
    render(<Harness description="Guests can order it." />)

    expect(control()).toHaveAccessibleDescription('Guests can order it.')
  })

  it('does not toggle when disabled', async () => {
    const user = userEvent.setup()
    render(<Harness initial={false} disabled />)

    await user.click(control())

    expect(screen.getByTestId('value')).toHaveTextContent('false')
  })

  it('shows the field’s error', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Break' }))

    expect(await screen.findByText('Nope.')).toBeInTheDocument()
  })
})
