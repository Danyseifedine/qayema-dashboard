import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PictureEmptyState } from '@/shared/components/feedback/states/picture-empty-state'

describe('PictureEmptyState', () => {
  it('heads the empty list with its picture, words and the button that fills it', () => {
    const { container } = render(
      <PictureEmptyState
        picture="/empty.webp"
        title="No table orders yet"
        description="They show here."
        action={<button type="button">Set up your tables</button>}
      />,
    )

    expect(screen.getByRole('region', { name: 'No table orders yet' })).toBeInTheDocument()
    expect(screen.getByText('They show here.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Set up your tables' })).toBeInTheDocument()
    // The picture is decoration: screen readers hear the words.
    expect(container.querySelector('img')).toHaveAttribute('aria-hidden', 'true')
  })

  it('can stand without a button', () => {
    render(<PictureEmptyState picture="/empty.webp" title="Nothing yet" description="Soon." />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
