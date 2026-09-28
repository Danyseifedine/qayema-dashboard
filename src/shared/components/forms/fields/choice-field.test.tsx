import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm, useWatch } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { ChoiceField, type ChoiceOption } from '@/shared/components/forms/fields/choice-field'

type Shape = 'round' | 'square' | 'pill'
type Values = { shape: Shape }

const OPTIONS: ChoiceOption<Shape>[] = [
  { value: 'round', label: 'Round', preview: <svg data-testid="preview-round" /> },
  { value: 'square', label: 'Square' },
  { value: 'pill', label: 'Pill' },
]

function Harness({ hint, disabled }: { hint?: string; disabled?: boolean }) {
  const form = useForm<Values>({ defaultValues: { shape: 'round' } })
  const shape = useWatch({ control: form.control, name: 'shape' })
  return (
    <>
      <ChoiceField
        control={form.control}
        name="shape"
        label="Button shape"
        options={OPTIONS}
        hint={hint}
        disabled={disabled}
        className="mt-1"
      />
      <output data-testid="value">{shape}</output>
      <button type="button" onClick={() => form.setError('shape', { message: 'Pick one.' })}>
        Break
      </button>
    </>
  )
}

describe('ChoiceField', () => {
  it('is a radio group with the current choice checked', () => {
    render(<Harness />)

    const group = screen.getByRole('group', { name: 'Button shape' })
    expect(group).not.toHaveAttribute('aria-describedby')
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(screen.getByRole('radio', { name: 'Round' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Round' }).closest('label')).toHaveClass(
      'border-[var(--gold-on)]',
    )
    expect(screen.getByTestId('preview-round')).toBeInTheDocument()
  })

  it('stores the option that is picked', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByText('Pill'))

    expect(screen.getByTestId('value')).toHaveTextContent('pill')
    expect(screen.getByRole('radio', { name: 'Pill' })).toBeChecked()
  })

  it('moves between options with the arrow keys', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    screen.getByRole('radio', { name: 'Round' }).focus()
    await user.keyboard('{ArrowRight}')

    expect(screen.getByTestId('value')).toHaveTextContent('square')
  })

  it('is described by its hint', () => {
    render(<Harness hint="Applies to every button." />)

    expect(screen.getByRole('group')).toHaveAccessibleDescription('Applies to every button.')
  })

  it('shows the error in place of the hint', async () => {
    const user = userEvent.setup()
    render(<Harness hint="Applies to every button." />)

    await user.click(screen.getByRole('button', { name: 'Break' }))

    expect(await screen.findByText('Pick one.')).toBeInTheDocument()
    expect(screen.queryByText('Applies to every button.')).not.toBeInTheDocument()
    expect(screen.getByRole('group')).toHaveAccessibleDescription('Pick one.')
  })

  it('cannot be changed when disabled', async () => {
    const user = userEvent.setup()
    render(<Harness disabled />)

    await user.click(screen.getByText('Pill'))

    expect(screen.getByTestId('value')).toHaveTextContent('round')
    expect(screen.getByRole('radio', { name: 'Pill' })).toBeDisabled()
    expect(screen.getByText('Pill').closest('label')).toHaveClass('cursor-not-allowed')
  })
})
