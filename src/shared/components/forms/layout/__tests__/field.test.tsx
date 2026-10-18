import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Field, type FieldProps } from '@/shared/components/forms/layout/field'

function renderField(props: Omit<FieldProps, 'children'>) {
  const seen: { id?: string; describedBy?: string; invalid?: boolean } = {}
  render(
    <Field {...props}>
      {(ids) => {
        Object.assign(seen, ids)
        return <input id={ids.id} aria-describedby={ids.describedBy} aria-invalid={ids.invalid} />
      }}
    </Field>,
  )
  return seen
}

describe('Field', () => {
  it('labels the control and describes nothing without a hint', () => {
    const ids = renderField({ label: 'Name' })

    const input = screen.getByRole('textbox', { name: 'Name' })
    expect(input.id).toBe(ids.id)
    expect(ids.describedBy).toBeUndefined()
    expect(ids.invalid).toBe(false)
  })

  it('renders no label row without a label', () => {
    renderField({})

    expect(document.querySelector('label')).toBeNull()
  })

  it('describes the control with its hint', () => {
    const ids = renderField({ label: 'Name', hint: 'As guests see it.' })

    expect(ids.describedBy).toBe(`${ids.id}-hint`)
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription('As guests see it.')
  })

  it('replaces the hint with the error and marks the control invalid', () => {
    const ids = renderField({ label: 'Name', hint: 'As guests see it.', error: 'Name it.' })

    expect(ids.invalid).toBe(true)
    expect(ids.describedBy).toBe(`${ids.id}-error`)
    expect(screen.getByText('Name it.')).toHaveClass('text-status-danger')
    expect(screen.queryByText('As guests see it.')).not.toBeInTheDocument()
  })

  it('shows the required star, an optional note and an action beside the label', () => {
    renderField({
      label: 'Name',
      required: true,
      optionalText: 'Optional',
      action: <button type="button">Reset</button>,
      className: 'mt-6',
    })

    expect(screen.getByText('*')).toBeInTheDocument()
    expect(screen.getByText('Optional')).toBeInTheDocument()
    const reset = screen.getByRole('button', { name: 'Reset' })
    // The action sits outside the <label>, so clicking it never focuses the field.
    expect(reset.closest('label')).toBeNull()
    expect(reset.closest('.mt-6')).not.toBeNull()
  })
})
