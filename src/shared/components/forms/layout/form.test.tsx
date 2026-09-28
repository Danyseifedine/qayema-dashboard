import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FieldGroup, Form, FormActions, FormSection } from '@/shared/components/forms/layout/form'

describe('Form', () => {
  it('leaves validation to the form library and passes props through', () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
    render(
      <Form aria-label="Dish" onSubmit={onSubmit} className="gap-8">
        <button type="submit">Save</button>
      </Form>,
    )

    const form = screen.getByRole('form', { name: 'Dish' })
    expect(form).toHaveAttribute('novalidate')
    expect(form).toHaveClass('flex', 'gap-8')
    expect(form).not.toHaveClass('gap-4')

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})

describe('FormSection', () => {
  it('heads a group of fields', () => {
    render(
      <FormSection title="Contact" description="How guests reach you." className="mt-2">
        <p>field</p>
      </FormSection>,
    )

    expect(screen.getByRole('heading', { name: 'Contact' })).toBeInTheDocument()
    expect(screen.getByText('How guests reach you.')).toBeInTheDocument()
    expect(screen.getByText('field')).toBeInTheDocument()
    expect(screen.getByRole('heading').closest('section')).toHaveClass('mt-2')
  })

  it('has no description line unless given one', () => {
    const { container } = render(
      <FormSection title="Contact">
        <span>field</span>
      </FormSection>,
    )

    expect(container.querySelectorAll('p')).toHaveLength(0)
  })
})

describe('FieldGroup', () => {
  it('lays two fields out side by side', () => {
    render(
      <FieldGroup className="mt-1">
        <span>one</span>
        <span>two</span>
      </FieldGroup>,
    )

    expect(screen.getByText('one').parentElement).toHaveClass('sm:grid-cols-2', 'mt-1')
  })
})

describe('FormActions', () => {
  it('pins its buttons to the end by default', () => {
    render(
      <FormActions>
        <span>save</span>
      </FormActions>,
    )

    expect(screen.getByText('save').parentElement).toHaveClass('justify-end')
  })

  it.each([
    ['start', 'justify-start'],
    ['between', 'justify-between'],
  ] as const)('aligns to %s', (align, className) => {
    render(
      <FormActions align={align} className="pt-6">
        <span>save</span>
      </FormActions>,
    )

    const row = screen.getByText('save').parentElement
    expect(row).toHaveClass(className, 'pt-6')
    expect(row).not.toHaveClass('justify-end')
  })
})
