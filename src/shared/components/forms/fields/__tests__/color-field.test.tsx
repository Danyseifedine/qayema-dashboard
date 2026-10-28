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
  action,
  layout,
}: {
  initial?: string
  label?: string
  error?: string
  action?: ReactNode
  layout?: 'inline' | 'tile'
}) {
  const form = useForm<Values>({ defaultValues: { accent: initial } })
  const accent = useWatch({ control: form.control, name: 'accent' })
  return (
    <>
      <ColorField
        control={form.control}
        name="accent"
        label={label}
        action={action}
        layout={layout}
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
const swatch = () => screen.getByRole('button', { name: 'Accent, picker' })
const swatchColor = () => (swatch().firstElementChild as HTMLElement).style.backgroundColor
const stored = () => screen.getByTestId('value').textContent

describe('ColorField', () => {
  it('shows the colour in the text box and the swatch', () => {
    render(<Harness />)

    expect(text()).toHaveValue('#C8A24A')
    expect(swatchColor()).toBe('rgb(200, 162, 74)')
  })

  it('shows black for a value that is not a whole colour', () => {
    render(<Harness initial="red" />)

    expect(text()).toHaveValue('#000000')
    expect(swatchColor()).toBe('rgb(0, 0, 0)')
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

  it('stores a colour chosen in the picker', async () => {
    const user = userEvent.setup()
    render(<Harness initial="#FF0000" />)

    await user.click(swatch())
    screen.getByRole('slider', { name: 'Hue' }).focus()
    await user.keyboard(
      '{Shift>}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{/Shift}',
    )

    // Sixty degrees round from red is yellow.
    expect(stored()).toBe('#FFFF00')
    expect(text()).toHaveValue('#FFFF00')
  })

  it('puts a large swatch beside the label on a tile', () => {
    render(<Harness layout="tile" action={<button type="button">Reset</button>} />)

    expect(swatch()).toHaveClass('size-9', 'p-0')
    expect(text()).toHaveClass('py-2')
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
  })

  it('shows its action', () => {
    render(<Harness action={<button type="button">Reset</button>} />)

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
})
