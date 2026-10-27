import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UserMenu, type UserMenuProps } from '@/app/layouts/authenticated/topbar/user-menu'

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

  it('changes the language from its preferences, and has no theme switch', async () => {
    const user = userEvent.setup()
    const { onLocaleChange, onLogout } = renderMenu()

    await user.click(trigger())
    const preferences = screen.getByRole('group', { name: 'Preferences' })
    await user.click(within(preferences).getByRole('tab', { name: 'ع' }))
    expect(onLocaleChange).toHaveBeenCalledWith('ar')

    // The dashboard is dark only.
    expect(within(preferences).queryByRole('switch')).not.toBeInTheDocument()
    expect(onLogout).not.toHaveBeenCalled()
  })

  it('moves between its entries with the arrow keys, round from either end', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(trigger())
    const publicMenu = screen.getByRole('menuitem', { name: /View public menu/ })
    const account = screen.getByRole('menuitem', { name: /Account/ })
    const logOut = screen.getByRole('menuitem', { name: /Log out/ })

    await user.keyboard('{ArrowDown}')
    expect(publicMenu).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(account).toHaveFocus()
    await user.keyboard('{ArrowUp}{ArrowUp}')
    expect(logOut).toHaveFocus()

    trigger().focus()
    await user.keyboard('{ArrowUp}')
    expect(logOut).toHaveFocus()
  })

  it('leaves the arrow keys to the language switch, and does nothing while closed', async () => {
    const user = userEvent.setup()
    renderMenu()

    trigger().focus()
    await user.keyboard('{ArrowDown}')
    expect(trigger()).toHaveFocus()

    await user.click(trigger())
    const arabic = within(screen.getByRole('group', { name: 'Preferences' })).getByRole('tab', {
      name: 'ع',
    })
    arabic.focus()
    await user.keyboard('{ArrowDown}')
    expect(arabic).toHaveFocus()
  })
})
