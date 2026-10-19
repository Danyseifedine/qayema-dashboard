import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SkeletonList } from '@/shared/components/feedback/skeletons/skeleton'

describe('SkeletonList', () => {
  it('lays out as many hidden blocks as asked', () => {
    const { container } = render(
      <SkeletonList count={3} className="grid gap-3" itemClassName="h-16" />,
    )

    const list = container.firstElementChild!
    expect(list).toHaveClass('grid', 'gap-3')
    expect(list.children).toHaveLength(3)
    expect(list.children[0]).toHaveClass('h-16', 'animate-pulse')
    expect(list.children[0]).toHaveAttribute('aria-hidden')
  })
})
