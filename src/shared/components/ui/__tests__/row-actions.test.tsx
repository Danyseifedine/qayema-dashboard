import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RowActions } from '@/shared/components/ui/row-actions'

describe('RowActions', () => {
  it('names each action and calls it', async () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    const user = userEvent.setup()
    render(
      <RowActions editLabel="Edit Mains" deleteLabel="Delete Mains" onEdit={onEdit} onDelete={onDelete} />,
    )

    await user.click(screen.getByRole('button', { name: 'Edit Mains' }))
    expect(onEdit).toHaveBeenCalledOnce()

    const remove = screen.getByRole('button', { name: 'Delete Mains' })
    expect(remove).toHaveClass('hover:text-status-danger')
    await user.click(remove)
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('leaves the bin out of a row that cannot be deleted here', () => {
    render(<RowActions editLabel="View Mains" onEdit={vi.fn()} view />)

    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'View Mains' })).toBeInTheDocument()
  })
})
