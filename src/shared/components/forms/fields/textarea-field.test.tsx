import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm, useWatch } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import {
  TextareaField,
  type TextareaFieldProps,
} from '@/shared/components/forms/fields/textarea-field'

type Values = { about: string | null }

function Harness({
  initial = '',
  ...props
}: { initial?: string | null } & Partial<TextareaFieldProps<Values>>) {
  const form = useForm<Values>({ defaultValues: { about: initial } })
  const about = useWatch({ control: form.control, name: 'about' })
  return (
    <>
      <TextareaField control={form.control} name="about" label="About" {...props} />
      <output data-testid="value">{JSON.stringify(about)}</output>
      <button type="button" onClick={() => form.setError('about', { message: 'Too long.' })}>
        Break
      </button>
    </>
  )
}

const box = () => screen.getByRole('textbox', { name: /^About/ })

describe('TextareaField', () => {
  it('writes what is typed into the form, four rows tall', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    expect(box()).toHaveAttribute('rows', '4')
    await user.type(box(), 'Family run')

    expect(screen.getByTestId('value')).toHaveTextContent('"Family run"')
  })

  it('shows a null value as empty and has no counter by default', () => {
    render(<Harness initial={null} />)

    expect(box()).toHaveValue('')
    expect(screen.queryByText(/\//)).not.toBeInTheDocument()
  })

  it('counts characters under the control', async () => {
    const user = userEvent.setup()
    render(<Harness maxLength={200} rows={2} />)

    expect(screen.getByText('0 / 200')).toBeInTheDocument()
    await user.type(box(), 'Hi')

    expect(screen.getByText('2 / 200')).toBeInTheDocument()
    expect(box()).toHaveAttribute('rows', '2')
  })

  it('passes the rest of its props to the control', () => {
    render(
      <Harness
        placeholder="Tell guests"
        hint="Shown under the name."
        required
        optionalText="Optional"
        disabled
      />,
    )

    expect(box()).toHaveAttribute('placeholder', 'Tell guests')
    expect(box()).toHaveAccessibleDescription('Shown under the name.')
    expect(box()).toBeDisabled()
    expect(screen.getByText('Optional')).toBeInTheDocument()
  })

  it('shows its error and marks itself invalid', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Break' }))

    expect(await screen.findByText('Too long.')).toBeInTheDocument()
    expect(box()).toHaveAttribute('aria-invalid', 'true')
  })
})
