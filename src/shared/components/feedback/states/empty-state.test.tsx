import { render, screen } from '@testing-library/react'
import { UtensilsCrossed } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { EmptyState } from '@/shared/components/feedback/states/empty-state'

describe('EmptyState', () => {
  it('shows just a title at its simplest', () => {
    const { container } = render(<EmptyState title="No dishes yet" />)

    expect(screen.getByText('No dishes yet')).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelectorAll('p')).toHaveLength(1)
    expect(container.firstElementChild).not.toHaveClass('flex-1')
  })

  it('shows an icon, a description and an action', () => {
    const { container } = render(
      <EmptyState
        icon={UtensilsCrossed}
        title="No dishes yet"
        description="Add your first dish."
        action={<button type="button">Add dish</button>}
        className="mt-4"
      />,
    )

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('Add your first dish.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add dish' })).toBeInTheDocument()
    expect(container.firstElementChild).toHaveClass('mt-4')
  })

  it('grows into the space left when asked to fill', () => {
    const { container } = render(<EmptyState title="Nothing" fill />)

    expect(container.firstElementChild).toHaveClass('flex-1', 'justify-center')
  })
})
