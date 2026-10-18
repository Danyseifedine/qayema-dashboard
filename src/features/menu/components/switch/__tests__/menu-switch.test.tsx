import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MenuSwitch } from '@/features/menu/components/switch/menu-switch'

describe('MenuSwitch', () => {
  it('marks the page it is on and opens the other', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<MenuSwitch value="dishes" onChange={onChange} />)

    expect(screen.getByRole('tablist', { name: 'Menu' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Dishes' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Categories' })).toHaveAttribute(
      'aria-selected',
      'false',
    )

    await user.click(screen.getByRole('tab', { name: 'Categories' }))
    expect(onChange).toHaveBeenCalledWith('categories')
  })

  it('stays out of the way where the sidebar shows both', () => {
    const { container } = render(<MenuSwitch value="categories" onChange={vi.fn()} />)

    expect(container.firstElementChild).toHaveClass('lg:hidden')
  })
})
