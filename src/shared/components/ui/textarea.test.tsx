import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Textarea } from '@/shared/components/ui/textarea'

describe('Textarea', () => {
  it('is four rows tall in a default shell', () => {
    render(<Textarea aria-label="Description" />)

    const textarea = screen.getByRole('textbox', { name: 'Description' })
    expect(textarea).toHaveAttribute('rows', '4')
    expect(textarea.parentElement).toHaveClass('items-stretch', 'border-[var(--line)]')
  })

  it('takes typed text', async () => {
    const user = userEvent.setup()
    render(<Textarea aria-label="Description" />)

    await user.type(screen.getByRole('textbox'), 'Line one')

    expect(screen.getByRole('textbox')).toHaveValue('Line one')
  })

  it('takes rows, a tone and a class', () => {
    render(<Textarea aria-label="Description" rows={2} tone="error" className="min-h-10" />)

    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveAttribute('rows', '2')
    expect(textarea).toHaveClass('min-h-10')
    expect(textarea).not.toHaveClass('min-h-24')
    expect(textarea.parentElement).toHaveClass('border-danger')
  })

  it('disables the control and its shell', () => {
    render(<Textarea aria-label="Description" disabled />)

    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('textbox').parentElement).toHaveAttribute('data-disabled', 'true')
  })
})
