import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LimitNotice } from '@/shared/components/data-display/badges/limit-notice'

describe('LimitNotice', () => {
  it('heads the section with its usage', () => {
    render(
      <LimitNotice label="Dishes" used={7} limit={20} description="Everything on your menu." />,
    )

    expect(screen.getByRole('heading', { name: 'Dishes' })).toBeInTheDocument()
    expect(screen.getByText('7 / 20')).toBeInTheDocument()
  })

  it('shows an unlimited count and a subtitle', () => {
    render(
      <LimitNotice label="Dishes" used={7} limit={null} description="Everything on your menu." />,
    )

    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('Everything on your menu.')).toBeInTheDocument()
  })
})
