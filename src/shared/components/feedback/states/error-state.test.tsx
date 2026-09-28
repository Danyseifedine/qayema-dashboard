import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ErrorState } from '@/shared/components/feedback/states/error-state'

describe('ErrorState', () => {
  it('announces a default title with no retry by default', () => {
    render(<ErrorState />)

    expect(screen.getByRole('alert')).toHaveTextContent('That did not load')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('retries with the default label', async () => {
    const onRetry = vi.fn()
    const user = userEvent.setup()
    render(<ErrorState onRetry={onRetry} />)

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('takes its own title, description and retry label', () => {
    render(
      <ErrorState
        title="Dishes did not load"
        description="Check your connection."
        onRetry={vi.fn()}
        retryLabel="Reload dishes"
        className="mt-8"
      />,
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Dishes did not load')
    expect(alert).not.toHaveTextContent('That did not load')
    expect(alert).toHaveClass('mt-8')
    expect(screen.getByText('Check your connection.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload dishes' })).toBeInTheDocument()
  })
})
