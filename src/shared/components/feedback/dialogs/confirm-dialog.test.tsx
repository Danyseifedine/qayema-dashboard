import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  ConfirmDialog,
  type ConfirmDialogProps,
} from '@/shared/components/feedback/dialogs/confirm-dialog'

function renderDialog(props: Partial<ConfirmDialogProps> = {}) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  const all: ConfirmDialogProps = {
    open: true,
    title: 'Delete this dish?',
    description: 'Guests will no longer see it.',
    confirmLabel: 'Delete',
    loading: false,
    onConfirm,
    onCancel,
    ...props,
  }
  const view = render(<ConfirmDialog {...all} />)
  const dialog = view.container.querySelector('dialog')!
  return { ...view, dialog, onConfirm, onCancel, props: all }
}

/** What the browser does on Escape: a cancelable `cancel` event on the dialog. */
function pressEscape(dialog: HTMLDialogElement) {
  const event = new Event('cancel', { cancelable: true })
  fireEvent(dialog, event)
  return event
}

describe('ConfirmDialog', () => {
  it('opens as a modal with the title, description and a destructive confirm', () => {
    const { dialog } = renderDialog()

    expect(dialog.open).toBe(true)
    expect(screen.getByRole('heading', { name: 'Delete this dish?' })).toBeInTheDocument()
    expect(screen.getByText('Guests will no longer see it.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('bg-danger')
  })

  it('stays closed while not open, and closes when told to', () => {
    const { dialog, rerender, props } = renderDialog({ open: false })
    expect(dialog.open).toBe(false)

    rerender(<ConfirmDialog {...props} open />)
    expect(dialog.open).toBe(true)

    rerender(<ConfirmDialog {...props} open />)
    expect(dialog.open).toBe(true)

    rerender(<ConfirmDialog {...props} open={false} />)
    expect(dialog.open).toBe(false)
  })

  it('confirms and cancels through its buttons', async () => {
    const user = userEvent.setup()
    const { onConfirm, onCancel } = renderDialog()

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('treats Escape as cancel and keeps the dialog for the caller to close', () => {
    const { dialog, onCancel } = renderDialog()

    const event = pressEscape(dialog)

    expect(event.defaultPrevented).toBe(true)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('cancels on a click on the backdrop but not inside the panel', () => {
    const { dialog, onCancel } = renderDialog()

    fireEvent.click(screen.getByRole('heading'))
    expect(onCancel).not.toHaveBeenCalled()

    fireEvent.click(dialog)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('cannot be dismissed while busy', async () => {
    const user = userEvent.setup()
    const { dialog, onCancel, onConfirm } = renderDialog({ loading: true })

    const confirm = screen.getByRole('button', { name: 'Delete' })
    expect(confirm).toHaveAttribute('aria-busy', 'true')
    expect(confirm).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()

    await user.click(confirm)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(pressEscape(dialog).defaultPrevented).toBe(true)
    fireEvent.click(dialog)

    expect(onConfirm).not.toHaveBeenCalled()
    expect(onCancel).not.toHaveBeenCalled()
    expect(dialog.open).toBe(true)
  })
})
