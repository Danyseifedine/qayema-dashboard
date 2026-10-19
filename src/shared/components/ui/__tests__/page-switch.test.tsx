import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PageSwitch } from '@/shared/components/ui/page-switch'

const OPTIONS = [
  { value: 'dishes', label: 'Dishes' },
  { value: 'categories', label: 'Categories' },
] as const

describe('PageSwitch', () => {
  it('marks the page it is on and opens the other', async () => {
    const onOpen = vi.fn()
    const user = userEvent.setup()
    render(<PageSwitch label="Menu" value="dishes" options={[...OPTIONS]} onOpen={onOpen} />)

    expect(screen.getByRole('tablist', { name: 'Menu' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Dishes' })).toHaveAttribute('aria-selected', 'true')

    // The tab it is on stays put.
    await user.click(screen.getByRole('tab', { name: 'Dishes' }))
    expect(onOpen).not.toHaveBeenCalled()

    await user.click(screen.getByRole('tab', { name: 'Categories' }))
    expect(onOpen).toHaveBeenCalledWith('categories')
  })

  it('stays out of the way where the sidebar shows both', () => {
    const { container } = render(
      <PageSwitch label="Menu" value="categories" options={[...OPTIONS]} onOpen={vi.fn()} />,
    )

    expect(container.firstElementChild).toHaveClass('lg:hidden')
  })
})
