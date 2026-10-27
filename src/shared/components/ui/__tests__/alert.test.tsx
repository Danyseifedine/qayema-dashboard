import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Alert } from '@/shared/components/ui/alert'

describe('Alert', () => {
  it('shows a note as an amber status', () => {
    render(<Alert variant="warning">Heads up</Alert>)

    const alert = screen.getByRole('status')
    expect(alert).toHaveTextContent('Heads up')
    expect(alert).toHaveClass('text-status-warn')
  })

  it('says a helpful word small and quiet, not bold', () => {
    render(<Alert variant="info">One language is enough.</Alert>)

    const note = screen.getByRole('status')
    expect(note).toHaveClass('text-[12.5px]', 'text-[var(--muted)]')
    expect(screen.getByText('One language is enough.')).not.toHaveClass('font-semibold')
  })

  it('is announced as a red alert for an error', () => {
    render(<Alert variant="error">Could not save</Alert>)

    expect(screen.getByRole('alert')).toHaveClass('text-status-danger')
  })

  it('shows a bold title above a lighter body', () => {
    render(
      <Alert variant="warning" title="Saved">
        Your menu is live.
      </Alert>,
    )

    expect(screen.getByText('Saved')).toHaveClass('font-semibold')
    expect(screen.getByText('Your menu is live.')).toHaveClass('mt-0.5')
    expect(screen.getByText('Your menu is live.')).not.toHaveClass('font-semibold')
  })

  it('makes the message bold without a title', () => {
    render(<Alert variant="warning">Just a body</Alert>)

    expect(screen.getByText('Just a body')).toHaveClass('font-semibold')
  })

  it('has no button unless asked', () => {
    render(<Alert variant="warning">Note</Alert>)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('is one button with an arrow when it leads somewhere', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(
      <Alert variant="warning" onClick={onClick}>
        2 orders are still waiting.
      </Alert>,
    )

    await user.click(screen.getByRole('button', { name: '2 orders are still waiting.' }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('dismisses with the default label', async () => {
    const onDismiss = vi.fn()
    const user = userEvent.setup()
    render(
      <Alert variant="warning" onDismiss={onDismiss}>
        Note
      </Alert>,
    )

    await user.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('takes a class from the caller', () => {
    render(
      <Alert variant="warning" className="mt-9">
        Note
      </Alert>,
    )

    expect(screen.getByRole('status')).toHaveClass('mt-9')
  })
})
