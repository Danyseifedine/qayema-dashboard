import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  FieldLeading,
  FieldPrefix,
  FieldShell,
  FieldTrailing,
  FieldTrailingButton,
} from '@/shared/components/ui/field-shell'

describe('FieldShell', () => {
  it('draws the default border and focus ring', () => {
    render(<FieldShell>inside</FieldShell>)

    const shell = screen.getByText('inside')
    expect(shell).toHaveClass('border-[var(--line)]', 'focus-within:border-gold')
    expect(shell).not.toHaveAttribute('data-disabled')
  })

  it('draws the error tone', () => {
    render(<FieldShell tone="error">inside</FieldShell>)

    const shell = screen.getByText('inside')
    expect(shell).toHaveClass('border-danger')
    expect(shell).not.toHaveClass('border-[var(--line)]')
  })

  it('draws the success tone', () => {
    render(<FieldShell tone="success">inside</FieldShell>)

    expect(screen.getByText('inside')).toHaveClass('border-status-success')
  })

  it('dims and marks itself when disabled', () => {
    render(
      <FieldShell disabled className="w-10">
        inside
      </FieldShell>,
    )

    const shell = screen.getByText('inside')
    expect(shell).toHaveAttribute('data-disabled', 'true')
    expect(shell).toHaveClass('pointer-events-none', 'w-10')
  })
})

describe('field slots', () => {
  it('renders the leading, prefix and trailing slots', () => {
    render(
      <FieldShell>
        <FieldLeading>
          <svg data-testid="icon" />
        </FieldLeading>
        <FieldPrefix>https://</FieldPrefix>
        <FieldTrailing>0 / 40</FieldTrailing>
      </FieldShell>,
    )

    expect(screen.getByTestId('icon')).toBeInTheDocument()
    expect(screen.getByText('https://')).toHaveClass('select-none')
    expect(screen.getByText('0 / 40')).toBeInTheDocument()
  })

  it('renders a labelled trailing button that does not submit', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(
      <form onSubmit={(event) => event.preventDefault()}>
        <FieldTrailingButton label="Show password" onClick={onClick}>
          <svg />
        </FieldTrailingButton>
      </form>,
    )

    const button = screen.getByRole('button', { name: 'Show password' })
    expect(button).toHaveAttribute('type', 'button')

    await user.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
