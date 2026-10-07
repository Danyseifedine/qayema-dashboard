import { render, screen } from '@testing-library/react'
import { IconToolsKitchen2 } from '@tabler/icons-react'
import { describe, expect, it } from 'vitest'
import { EmptyState } from '@/shared/components/feedback/states/empty-state'

describe('EmptyState', () => {
  it('shows an icon, a title and a description', () => {
    const { container } = render(
      <EmptyState
        icon={IconToolsKitchen2}
        title="No dishes yet"
        description="Add your first dish."
      />,
    )

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('No dishes yet')).toBeInTheDocument()
    expect(screen.getByText('Add your first dish.')).toBeInTheDocument()
    expect(container.firstElementChild).not.toHaveClass('flex-1')
  })

  it('shows an action', () => {
    render(
      <EmptyState
        icon={IconToolsKitchen2}
        title="No dishes yet"
        description="Add your first dish."
        action={<button type="button">Add dish</button>}
      />,
    )

    expect(screen.getByRole('button', { name: 'Add dish' })).toBeInTheDocument()
  })

  it('grows into the space left when asked to fill', () => {
    const { container } = render(
      <EmptyState icon={IconToolsKitchen2} title="Nothing" description="Nothing here." fill />,
    )

    expect(container.firstElementChild).toHaveClass('flex-1', 'justify-center')
  })
})
