import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { ColorField } from '@/shared/components/forms/fields/color-field'

type Values = { accent: string }

function Harness({
  initial = '#C8A24A',
  label = 'Accent',
  error,
  hint,
  action,
  disabled,
}: {
  initial?: string
  label?: ReactNode
  error?: string
  hint?: ReactNode
  action?: ReactNode
  disabled?: boolean
}) {
  const form = useForm<Values>({ defaultValues: { accent: initial } })
  const accent = useWatch({ control: form.control, name: 'accent' })
  return (
    <>
      <ColorField
        control={form.control}
        name="accent"
        label={label}
        hint={hint}
        action={action}
        disabled={disabled}
      />
      <output data-testid="value">{accent}</output>
      {error ? (
        <button type="button" onClick={() => form.setError('accent', { message: error })}>
          Break
        </button>
      ) : null}
      <button type="button">elsewhere</button>
    </>
  )
}

const text = () => screen.getByRole('textbox', { name: 'Accent' })
const stored = () => screen.getByTestId('value').textContent

describe('ColorField', () => {
  it('shows the colour in the text box and the swatch', () => {
    render(<Harness />)

    expect(text()).toHaveValue('#C8A24A')
    expect(screen.getByLabelText('Accent, picker')).toHaveValue('#c8a24a')
  })

  it('shows black for a value that is not a whole colour', () => {
    render(<Harness initial="red" />)

    expect(text()).toHaveValue('#000000')
    expect(screen.getByLabelText('Accent, picker')).toHaveValue('#000000')
  })

  it('keeps the last whole colour while a hex is half typed', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.clear(text())
    await user.type(text(), '#12')

    expect(text()).toHaveValue('#12')
    expect(stored()).toBe('#C8A24A')
  })

  it('stores a typed hex in upper case once it is complete', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.clear(text())
    await user.type(text(), '#abcdef')

    expect(stored()).toBe('#ABCDEF')
  })

  it('trims a pasted value before reading it', () => {
    render(<Harness />)

    fireEvent.focus(text())
    fireEvent.change(text(), { target: { value: ' #00ff00 ' } })

    expect(stored()).toBe('#00FF00')
  })

  it('shows the stored colour again when the box loses focus', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.clear(text())
    await user.type(text(), '#12')
    await user.click(screen.getByRole('button', { name: 'elsewhere' }))

    expect(text()).toHaveValue('#C8A24A')
  })

  it('stores a colour chosen in the system picker', () => {
    render(<Harness />)

    fireEvent.change(screen.getByLabelText('Accent, picker'), { target: { value: '#112233' } })

    expect(stored()).toBe('#112233')
    expect(text()).toHaveValue('#112233')
  })

  it('names the picker generically when the label is not plain text', () => {
    render(<Harness label={<strong>Accent</strong>} />)

    expect(screen.getByLabelText('Colour picker')).toBeInTheDocument()
  })

  it('shows its hint and action', () => {
    render(<Harness hint="Used for buttons." action={<button type="button">Reset</button>} />)

    expect(text()).toHaveAccessibleDescription('Used for buttons.')
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
  })

  it('marks itself invalid with the field’s error', async () => {
    const user = userEvent.setup()
    render(<Harness error="Pick a colour." />)

    await user.click(screen.getByRole('button', { name: 'Break' }))

    expect(await screen.findByText('Pick a colour.')).toBeInTheDocument()
    expect(text()).toHaveAttribute('aria-invalid', 'true')
    expect(text()).toHaveAccessibleDescription('Pick a colour.')
  })

  it('disables both controls', () => {
    render(<Harness disabled />)

    expect(text()).toBeDisabled()
    expect(screen.getByLabelText('Accent, picker')).toBeDisabled()
  })
})
