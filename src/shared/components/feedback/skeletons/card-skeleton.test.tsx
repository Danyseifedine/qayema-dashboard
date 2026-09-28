import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CardGridSkeleton } from '@/shared/components/feedback/skeletons/card-skeleton'

describe('CardGridSkeleton', () => {
  it('shows six cards by default, hidden from screen readers', () => {
    const { container } = render(<CardGridSkeleton />)

    const cards = container.firstElementChild?.children
    expect(cards).toHaveLength(6)
    expect(cards?.[0]).toHaveAttribute('aria-hidden', 'true')
    expect(cards?.[0]?.querySelectorAll('.animate-pulse')).toHaveLength(3)
  })

  it('shows as many cards as asked', () => {
    const { container } = render(<CardGridSkeleton count={2} />)

    expect(container.firstElementChild?.children).toHaveLength(2)
  })
})
