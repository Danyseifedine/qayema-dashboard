import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IconPencil, IconTrash } from '@tabler/icons-react'
import { describe, expect, it, vi } from 'vitest'
import { ActionMenu } from '@/shared/components/ui/action-menu'

function renderMenu() {
  const onEdit = vi.fn()
  const onDelete = vi.fn()
  render(
    <>
      <ActionMenu
        label="More for order A1"
        items={[
          { label: 'Edit', ariaLabel: 'Edit order A1', icon: IconPencil, onSelect: onEdit },
          { label: 'Delete', icon: IconTrash, onSelect: onDelete, danger: true },
        ]}
      />
      <p>Outside</p>
    </>,
  )
  return { onEdit, onDelete }
}

describe('ActionMenu', () => {
  it('opens on the ⋮ button and runs the chosen action, then closes', async () => {
    const user = userEvent.setup()
    const { onEdit } = renderMenu()

    const trigger = screen.getByRole('button', { name: 'More for order A1' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await user.click(screen.getByRole('menuitem', { name: 'Edit order A1' }))

    expect(onEdit).toHaveBeenCalledOnce()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('moves with the arrow keys and closes on Escape', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getByRole('button', { name: 'More for order A1' }))
    expect(screen.getByRole('menuitem', { name: 'Edit order A1' })).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Edit order A1' })).toHaveFocus()
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'More for order A1' })).toHaveFocus()
  })

  it('goes round from the first action to the last, and closes when focus leaves', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getByRole('button', { name: 'More for order A1' }))
    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus()
    await user.keyboard('{Tab}')

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes on a click outside', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getByRole('button', { name: 'More for order A1' }))
    await user.click(screen.getByText('Outside'))

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
