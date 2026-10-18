import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Label } from '@/shared/components/ui/label'

describe('Label', () => {
  it('labels its control', () => {
    render(
      <>
        <Label htmlFor="name">Name</Label>
        <input id="name" />
      </>,
    )

    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument()
    expect(screen.queryByText('*')).not.toBeInTheDocument()
  })

  it('adds a star hidden from screen readers when required', () => {
    render(
      <>
        <Label htmlFor="name" required>
          Name
        </Label>
        <input id="name" />
      </>,
    )

    const star = screen.getByText('*')
    expect(star).toHaveAttribute('aria-hidden', 'true')
    // The accessible name stays just "Name".
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument()
  })

  it('shows an optional note on the trailing side', () => {
    render(
      <Label optionalText="Optional" className="mt-3">
        Website
      </Label>,
    )

    expect(screen.getByText('Optional')).toBeInTheDocument()
    expect(screen.getByText('Website').closest('label')).toHaveClass('mt-3')
  })
})
