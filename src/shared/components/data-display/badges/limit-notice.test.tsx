import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LimitNotice } from '@/shared/components/data-display/badges/limit-notice'

describe('LimitNotice', () => {
  it('heads the section with its usage', () => {
    const { container } = render(<LimitNotice label="Dishes" used={7} limit={20} />)

    expect(screen.getByRole('heading', { name: 'Dishes' })).toBeInTheDocument()
    expect(screen.getByText('7 / 20')).toBeInTheDocument()
    expect(container.querySelector('p')).toBeNull()
  })

  it('shows an unlimited count and a subtitle', () => {
    render(
      <LimitNotice
        label="Dishes"
        used={7}
        limit={null}
        description="Everything on your menu."
        className="mb-2"
      />,
    )

    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('Everything on your menu.')).toBeInTheDocument()
    expect(screen.getByRole('heading').parentElement?.parentElement).toHaveClass('mb-2')
  })
})
