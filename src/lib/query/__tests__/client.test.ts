import { describe, expect, it } from 'vitest'
import { createQueryClient, NETWORK_RETRIES, SERVER_RETRIES } from '@/lib/query/client'
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

  it('keeps trying a dropped connection longer than a failing server', () => {
    const shouldRetry = retryOf()
    const network = new ApiError({ message: 'offline', status: 0 })
    const server = new ApiError({ message: 'down', status: 503 })

    // A request that never reached the server: four more tries (1, 2, 4, 8 s).
    expect(shouldRetry(0, network)).toBe(true)
    expect(shouldRetry(3, network)).toBe(true)
    expect(shouldRetry(4, network)).toBe(false)
    // A server that answered with a failure: two more tries.
    expect(shouldRetry(1, server)).toBe(true)
    expect(shouldRetry(2, server)).toBe(false)
    expect(NETWORK_RETRIES).toBe(4)
    expect(SERVER_RETRIES).toBe(2)
  })

  it('never retries a 4xx or something that is not an ApiError', () => {
    const shouldRetry = retryOf()

    for (const status of [401, 403, 404, 422, 429]) {
      expect(shouldRetry(0, new ApiError({ message: 'no', status }))).toBe(false)
    }
    expect(shouldRetry(0, new Error('plain'))).toBe(false)
  })
})
