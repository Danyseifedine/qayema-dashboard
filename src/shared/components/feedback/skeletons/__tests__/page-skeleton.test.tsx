import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageSkeleton } from '@/shared/components/feedback/skeletons/page-skeleton'

describe('PageSkeleton', () => {
  it('holds the place of a page and stays out of the accessibility tree', () => {
    render(<PageSkeleton />)

    expect(screen.getByTestId('page-skeleton')).toHaveAttribute('aria-hidden', 'true')
  })
})
