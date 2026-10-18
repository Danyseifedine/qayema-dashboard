import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Alert } from '@/shared/components/ui/alert'

describe('Alert', () => {
  it('shows information as a status', () => {
    render(<Alert variant="info">Heads up</Alert>)

    const alert = screen.getByRole('status')
    expect(alert).toHaveTextContent('Heads up')
    expect(alert).toHaveClass('text-status-info')
  })

  it('is announced as an alert for an error', () => {
    render(<Alert variant="error">Could not save</Alert>)

    expect(screen.getByRole('alert')).toHaveClass('text-status-danger')
  })

  it.each([
    ['warning', 'text-status-warn'],
    ['success', 'text-status-success'],
  ] as const)('shows a %s as a status', (variant, className) => {
    render(<Alert variant={variant}>Note</Alert>)

    expect(screen.getByRole('status')).toHaveClass(className)
  })

  it('shows a title above the body', () => {
    render(
      <Alert variant="info" title="Saved">
        Your menu is live.
      </Alert>,
    )

    expect(screen.getByText('Saved')).toBeInTheDocument()
    expect(screen.getByText('Your menu is live.')).toHaveClass('mt-1')
  })

  it('gives the body no top margin without a title', () => {
    render(<Alert variant="info">Just a body</Alert>)

    expect(screen.getByText('Just a body')).not.toHaveClass('mt-1')
  })

  it('has no dismiss button unless asked', () => {
    render(<Alert variant="info">Note</Alert>)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('dismisses with the default label', async () => {
    const onDismiss = vi.fn()
    const user = userEvent.setup()
    render(
      <Alert variant="info" onDismiss={onDismiss}>
        Note
      </Alert>,
    )

    await user.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('takes a class from the caller', () => {
    render(
      <Alert variant="info" className="mt-9">
        Note
      </Alert>,
    )

    expect(screen.getByRole('status')).toHaveClass('mt-9')
  })
})
