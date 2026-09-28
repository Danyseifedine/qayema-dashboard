import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm, useWatch } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { TextField, type TextFieldProps } from '@/shared/components/forms/fields/text-field'

type Values = { name: string | null }

function Harness({
  initial = '',
  ...props
}: { initial?: string | null } & Partial<TextFieldProps<Values>>) {
  const form = useForm<Values>({ defaultValues: { name: initial } })
  const name = useWatch({ control: form.control, name: 'name' })
  return (
    <>
      <TextField control={form.control} name="name" label="Name" {...props} />
      <output data-testid="value">{JSON.stringify(name)}</output>
      <button type="button" onClick={() => form.setError('name', { message: 'Name it.' })}>
        Break
      </button>
    </>
  )
}

describe('TextField', () => {
  it('writes what is typed into the form', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Soup')

    expect(screen.getByTestId('value')).toHaveTextContent('"Soup"')
  })

  it('shows a null value as empty', () => {
    render(<Harness initial={null} />)

    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('')
  })

  it('counts characters against the maximum', async () => {
    const user = userEvent.setup()
    render(<Harness maxLength={10} />)

    expect(screen.getByText('0 / 10')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox'), 'Soup')

    expect(screen.getByText('4 / 10')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '10')
  })

  it('starts a password masked and reveals it on request', async () => {
    const user = userEvent.setup()
    const { container } = render(<Harness password maxLength={10} />)

    const input = container.querySelector('input')!
    expect(input).toHaveAttribute('type', 'password')
    // The reveal toggle takes the trailing slot over the counter.
    expect(screen.queryByText('0 / 10')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(input).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(input).toHaveAttribute('type', 'password')
  })

  it('forces left-to-right entry when asked', () => {
    render(<Harness forceLtr type="email" inputMode="email" />)

    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('dir', 'ltr')
    expect(input).toHaveClass('text-start')
    expect(input).toHaveAttribute('type', 'email')
    expect(input).toHaveAttribute('inputMode', 'email')
  })

  it('leaves the direction alone by default', () => {
    render(<Harness />)

    expect(screen.getByRole('textbox')).not.toHaveAttribute('dir')
  })

  it('can be named without a visible label', () => {
    render(<Harness label={undefined} aria-label="Monday opening" />)

    expect(screen.getByRole('textbox', { name: 'Monday opening' })).toBeInTheDocument()
  })

  it('passes the rest of its props to the control', () => {
    render(
      <Harness
        placeholder="e.g. Soup"
        hint="Shown on the menu."
        required
        optionalText="Optional"
        disabled
        autoComplete="off"
        prefix="@"
        leadingIcon={<svg data-testid="icon" />}
      />,
    )

    const input = screen.getByRole('textbox', { name: /^Name/ })
    expect(input).toHaveAttribute('placeholder', 'e.g. Soup')
    expect(input).toHaveAttribute('autoComplete', 'off')
    expect(input).toHaveAccessibleDescription('Shown on the menu.')
    expect(input).toBeDisabled()
    expect(screen.getByText('@')).toBeInTheDocument()
    expect(screen.getByText('Optional')).toBeInTheDocument()
    expect(screen.getByText('*')).toBeInTheDocument()
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('shows its error and marks itself invalid', async () => {
    const user = userEvent.setup()
    render(<Harness hint="Shown on the menu." />)

    await user.click(screen.getByRole('button', { name: 'Break' }))

    const input = screen.getByRole('textbox', { name: 'Name' })
    expect(await screen.findByText('Name it.')).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Name it.')
    expect(screen.queryByText('Shown on the menu.')).not.toBeInTheDocument()
  })
})
