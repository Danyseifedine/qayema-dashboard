import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MenuSwitch } from '@/features/menu/components/nav/menu-switch'

describe('MenuSwitch', () => {
  it('shows Dishes and Categories under Menu, the open one marked, and opens the other', async () => {
    const onOpen = vi.fn()
    const user = userEvent.setup()
    render(<MenuSwitch value="categories" onOpen={onOpen} />)

    const menu = screen.getByRole('tablist', { name: 'Menu' })
    expect(
      within(menu)
        .getAllByRole('tab')
        .map((tab) => tab.textContent),
    ).toEqual(['Dishes', 'Categories'])
    expect(within(menu).getByRole('tab', { name: 'Categories' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await user.click(within(menu).getByRole('tab', { name: 'Dishes' }))

    expect(onOpen).toHaveBeenCalledOnce()
  })
})
