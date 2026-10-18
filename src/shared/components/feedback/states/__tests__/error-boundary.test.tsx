import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from '@/shared/components/feedback/states/error-boundary'

const { reportError } = vi.hoisted(() => ({ reportError: vi.fn() }))
vi.mock('@/lib/api/report-error', () => ({ reportError }))

function Broken(): never {
  throw new TypeError('dish.name is undefined')
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React logs a caught render error to the console; the test expects it.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    reportError.mockReset()
  })

  it('shows what it holds while nothing breaks', () => {
    render(
      <ErrorBoundary>
        <p>The dishes</p>
      </ErrorBoundary>,
    )

    expect(screen.getByText('The dishes')).toBeInTheDocument()
    expect(reportError).not.toHaveBeenCalled()
  })

  it('shows a way out instead of a blank page, reports the error, and reloads', async () => {
    const reload = vi.fn()
    vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, reload })
    const user = userEvent.setup()

    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Something on this page went wrong. We have been told; try again.',
    )
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'dish.name is undefined' }),
      'render',
      expect.stringContaining('Broken'),
    )

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(reload).toHaveBeenCalledOnce()
  })
})
