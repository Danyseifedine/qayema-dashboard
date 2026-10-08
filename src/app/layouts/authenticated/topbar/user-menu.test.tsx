import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { UserMenu, type UserMenuProps } from '@/app/layouts/authenticated/topbar/user-menu'
import { usePreferencesStore } from '@/stores/preferences.store'

function renderMenu(props: Partial<UserMenuProps> = {}) {
  const handlers = {
    onLocaleChange: vi.fn(),
    onOpenAccount: vi.fn(),
    onLogout: vi.fn(),
  }
  render(
    <div>
      <p>Outside</p>
      <UserMenu
        name="Dany"
        login="owner@example.com"
        publicUrl="https://qayema.test/beit-qayema"
        locale="en"
        {...handlers}
        {...props}
      />
    </div>,
  )
  return handlers
}

const trigger = () => screen.getByRole('button', { name: 'Account menu' })

describe('UserMenu', () => {
  afterEach(() => {
    usePreferencesStore.getState().setTheme('light')
  })

  it("shows the owner's initial, capitalised", () => {
    renderMenu({ name: '  dany ' })
    expect(trigger()).toHaveTextContent('D')
  })

  it('shows a question mark for a blank name', () => {
    renderMenu({ name: '   ' })
    expect(trigger()).toHaveTextContent('?')
  })

  it('opens and closes from its button', async () => {
    const user = userEvent.setup()
    renderMenu()

    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    await user.click(trigger())
    expect(trigger()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await user.click(trigger())
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes on a click outside, but not on one inside', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(trigger())
    await user.click(screen.getByText('owner@example.com'))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await user.click(screen.getByText('Outside'))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes on Escape and hands focus back to its button', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(trigger())
    await user.keyboard('{Tab}')
    await user.keyboard('a')
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger()).toHaveFocus()
  })

  it('opens the public menu in a new tab and closes', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(trigger())
    const link = screen.getByRole('menuitem', { name: /View public menu/ })
    expect(link).toHaveAttribute('target', '_blank')
    link.addEventListener('click', (event) => event.preventDefault())
    await user.click(link)

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('has no public menu link before the menu has a URL', async () => {
    const user = userEvent.setup()
    renderMenu({ publicUrl: null })

    await user.click(trigger())
    expect(screen.queryByRole('menuitem', { name: /View public menu/ })).not.toBeInTheDocument()
  })

  it('opens the account page and closes', async () => {
    const user = userEvent.setup()
    const { onOpenAccount } = renderMenu()

    await user.click(trigger())
    await user.click(screen.getByRole('menuitem', { name: /Account/ }))

    expect(onOpenAccount).toHaveBeenCalledOnce()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('changes the language and the theme from its preferences', async () => {
    const user = userEvent.setup()
    const { onLocaleChange, onLogout } = renderMenu()

    await user.click(trigger())
    const preferences = screen.getByRole('group', { name: 'Preferences' })
    await user.click(within(preferences).getByRole('tab', { name: 'ع' }))
    expect(onLocaleChange).toHaveBeenCalledWith('ar')

    await user.click(within(preferences).getByRole('switch', { name: 'Dark mode' }))
    expect(usePreferencesStore.getState().theme).toBe('dark')
    expect(onLogout).not.toHaveBeenCalled()
  })
})
