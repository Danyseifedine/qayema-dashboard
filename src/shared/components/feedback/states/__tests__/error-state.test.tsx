import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ErrorState } from '@/shared/components/feedback/states/error-state'

describe('ErrorState', () => {
  it('announces what failed and retries', async () => {
    const onRetry = vi.fn()
    const user = userEvent.setup()
    render(<ErrorState description="Check your connection." onRetry={onRetry} />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('That did not load')
    expect(alert).toHaveTextContent('Check your connection.')

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
