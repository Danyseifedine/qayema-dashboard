import { afterEach, describe, expect, it, vi } from 'vitest'
import { toast } from '@/shared/components/feedback/toasts/toast'
import { ApiError } from '@/shared/types/api'

const sonner = vi.hoisted(() => {
  const fn = vi.fn() as ReturnType<typeof vi.fn> & {
    success: ReturnType<typeof vi.fn>
    error: ReturnType<typeof vi.fn>
    dismiss: ReturnType<typeof vi.fn>
  }
  fn.success = vi.fn()
  fn.error = vi.fn()
  fn.dismiss = vi.fn()
  return fn
})

vi.mock('sonner', () => ({ toast: sonner }))

afterEach(() => {
  vi.clearAllMocks()
})

describe('toast', () => {
  it('shows a success with its description', () => {
    toast.success('Saved', 'Your menu is live.')

    expect(sonner.success).toHaveBeenCalledWith('Saved', { description: 'Your menu is live.' })
  })

  it('shows a plain message', () => {
    toast.info('Heads up')

    expect(sonner).toHaveBeenCalledWith('Heads up', { description: undefined })
  })

  it('dismisses every toast', () => {
    toast.dismiss()

    expect(sonner.dismiss).toHaveBeenCalledTimes(1)
  })

  describe('error', () => {
    it('shows only the fallback for an error that is not from the API', () => {
      toast.error('Could not save', new Error('boom'))
      toast.error('Could not save')

      expect(sonner.error).toHaveBeenNthCalledWith(1, 'Could not save', { description: undefined })
      expect(sonner.error).toHaveBeenNthCalledWith(2, 'Could not save', { description: undefined })
    })

    it('carries the server’s own wording for an API error', () => {
      toast.error('Could not save', new ApiError({ message: 'Dish limit reached.', status: 403 }))

      expect(sonner.error).toHaveBeenCalledWith('Could not save', {
        description: 'Dish limit reached.',
      })
    })

    it('says how long to wait on a rate limit', () => {
      const error = new ApiError({
        message: 'Too Many Attempts.',
        status: 429,
        body: { retry_after: 30 },
      })

      toast.error('Could not save', error)

      expect(sonner.error).toHaveBeenCalledWith('Could not save', {
        description: 'Too many requests. Try again in 30 seconds.',
      })
    })

    it('uses the singular for a one-second wait', () => {
      toast.error('x', new ApiError({ message: 'x', status: 429, body: { retry_after: 1 } }))

      expect(sonner.error).toHaveBeenCalledWith('x', {
        description: 'Too many requests. Try again in 1 second.',
      })
    })

    it('asks for a moment when a rate limit gives no wait time', () => {
      toast.error('x', new ApiError({ message: 'Too Many Attempts.', status: 429 }))

      expect(sonner.error).toHaveBeenCalledWith('x', {
        description: 'Too many requests. Wait a moment and try again.',
      })
    })
  })
})
