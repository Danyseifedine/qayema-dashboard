import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  CardGridSkeleton,
  CardSkeleton,
} from '@/shared/components/feedback/skeletons/card-skeleton'

describe('CardSkeleton', () => {
  it('is hidden from screen readers and takes a class', () => {
    const { container } = render(<CardSkeleton className="w-40" />)

    const card = container.firstElementChild
    expect(card).toHaveAttribute('aria-hidden', 'true')
    expect(card).toHaveClass('w-40')
    expect(card?.querySelectorAll('.animate-pulse')).toHaveLength(3)
  })
})

describe('CardGridSkeleton', () => {
  it('shows six cards by default', () => {
    const { container } = render(<CardGridSkeleton />)

    expect(container.firstElementChild?.children).toHaveLength(6)
  })

  it('shows as many cards as asked', () => {
    const { container } = render(<CardGridSkeleton count={2} />)

    expect(container.firstElementChild?.children).toHaveLength(2)
  })
})
