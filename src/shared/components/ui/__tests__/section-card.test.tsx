import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SectionCard } from '@/shared/components/ui/section-card'

describe('SectionCard', () => {
  it('names its part of the page, says what it holds, and holds it', () => {
    render(
      <SectionCard icon={<span>Aa</span>} title="Fonts" description="One font per script.">
        <p>Inter</p>
      </SectionCard>,
    )

    const card = screen.getByRole('region', { name: 'Fonts' })
    expect(card).toHaveTextContent('One font per script.')
    expect(card).toHaveTextContent('Inter')
  })

  it('can be a title alone', () => {
    render(<SectionCard icon={<span>Aa</span>} title="Classic" />)

    expect(screen.getByRole('region', { name: 'Classic' })).toHaveTextContent('Classic')
  })

  it('hangs its photo past the edge, or keeps it inside when told to', () => {
    const { container, rerender } = render(
      <SectionCard icon={<span>Aa</span>} title="Colours" picture="/colors.webp" />,
    )
    const photo = () => container.querySelector('img')!
    expect(photo()).toHaveAttribute('src', '/colors.webp')
    expect(photo()).toHaveClass('-end-[16%]')

    rerender(
      <SectionCard icon={<span>Aa</span>} title="You" picture="/profile.webp" bleed={false} />,
    )
    expect(photo()).toHaveClass('end-0')
    expect(photo()).not.toHaveClass('-end-[16%]')
  })

  it('can carry a smaller photo, whole in its corner', () => {
    const { container } = render(
      <SectionCard
        icon={<span>Aa</span>}
        title="Orders"
        picture="/orders.webp"
        bleed={false}
        smallPicture
      />,
    )

    expect(container.querySelector('img')).toHaveClass('end-0', 'w-[40%]', 'h-[100px]', 'object-center')
  })
})
