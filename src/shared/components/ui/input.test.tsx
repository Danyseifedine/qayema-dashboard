import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Input } from '@/shared/components/ui/input'

describe('Input', () => {
  it('is a plain text box inside a default-tone shell', () => {
    render(<Input aria-label="Name" />)

    const input = screen.getByRole('textbox', { name: 'Name' })
    expect(input).toHaveAttribute('type', 'text')
    expect(input).not.toHaveClass('ps-1')
    expect(input).not.toHaveClass('pe-0')
    expect(input.parentElement).toHaveClass('border-[var(--line)]')
    expect(input.parentElement).not.toHaveAttribute('data-disabled')
  })

  it('passes typing through to its handler', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Input aria-label="Name" onChange={onChange} />)

    await user.type(screen.getByRole('textbox'), 'Hi')

    expect(onChange).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('textbox')).toHaveValue('Hi')
  })

  it('makes room for a leading icon', () => {
    render(<Input aria-label="Search" leadingIcon={<svg data-testid="icon" />} />)

    expect(screen.getByTestId('icon')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveClass('ps-1')
  })

  it('shows a prefix before the text', () => {
    render(<Input aria-label="Price" prefix="USD" />)

    expect(screen.getByText('USD')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveClass('ps-1')
  })

  it('shows a trailing adornment and tightens the end padding', () => {
    render(<Input aria-label="Name" trailing={<span>3 / 20</span>} />)

    expect(screen.getByText('3 / 20')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveClass('pe-0')
  })

  it('paints the error tone on the shell', () => {
    render(<Input aria-label="Name" tone="error" />)

    expect(screen.getByRole('textbox').parentElement).toHaveClass('border-danger')
  })

  it('disables both the control and its shell', () => {
    render(<Input aria-label="Name" disabled />)

    const input = screen.getByRole('textbox')
    expect(input).toBeDisabled()
    expect(input.parentElement).toHaveAttribute('data-disabled', 'true')
  })

  it('sends one class to the control and another to the shell', () => {
    render(<Input aria-label="Name" type="email" className="font-mono" shellClassName="w-40" />)

    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('type', 'email')
    expect(input).toHaveClass('font-mono')
    expect(input.parentElement).toHaveClass('w-40')
  })
})
