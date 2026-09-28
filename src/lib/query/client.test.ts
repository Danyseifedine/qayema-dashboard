import { describe, expect, it } from 'vitest'
import { createQueryClient } from '@/lib/query/client'
import { ApiError } from '@/shared/types/api'

function retryOf() {
  const retry = createQueryClient().getDefaultOptions().queries?.retry
  if (typeof retry !== 'function') throw new Error('retry should be a function')
  return (count: number, error: unknown) => retry(count, error as Error)
}

describe('createQueryClient', () => {
  it('sets the shared cache defaults', () => {
    const options = createQueryClient().getDefaultOptions()

    expect(options.queries?.staleTime).toBe(30_000)
    expect(options.queries?.gcTime).toBe(300_000)
    expect(options.queries?.refetchOnWindowFocus).toBe(false)
    expect(options.mutations?.retry).toBe(false)
  })

  it('retries network and server failures, up to twice', () => {
    const shouldRetry = retryOf()
    const network = new ApiError({ message: 'offline', status: 0 })
    const server = new ApiError({ message: 'down', status: 503 })

    expect(shouldRetry(0, network)).toBe(true)
    expect(shouldRetry(1, server)).toBe(true)
    expect(shouldRetry(2, server)).toBe(false)
    expect(shouldRetry(2, network)).toBe(false)
  })

  it('never retries a 4xx or something that is not an ApiError', () => {
    const shouldRetry = retryOf()

    for (const status of [401, 403, 404, 422, 429]) {
      expect(shouldRetry(0, new ApiError({ message: 'no', status }))).toBe(false)
    }
    expect(shouldRetry(0, new Error('plain'))).toBe(false)
  })
})
