import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { api } from '@/lib/api/client'
import { request, RESEND_AFTER } from '@/lib/api/request'
import { ApiError } from '@/shared/types/api'

let mock: MockAdapter

const schema = z.object({ data: z.object({ id: z.number() }) })

describe('request', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('returns the parsed body', async () => {
    mock.onGet('/api/thing').reply(200, { data: { id: 3 }, extra: 'dropped' })

    await expect(request(schema, { method: 'GET', url: '/api/thing' })).resolves.toEqual({
      data: { id: 3 },
    })
  })

  it('turns an HTTP failure into an ApiError', async () => {
    mock.onGet('/api/thing').reply(404, { message: 'Not found', code: 'not_found' })

    const failure = request(schema, { method: 'GET', url: '/api/thing' })
    await expect(failure).rejects.toBeInstanceOf(ApiError)
    await expect(failure).rejects.toMatchObject({ status: 404, code: 'not_found' })
  })

  it('fails with a readable error when the body does not match the schema, logging in development', async () => {
    vi.stubEnv('DEV', true)
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    mock.onGet('/api/thing').reply(200, { data: { id: 'three' } })

    const failure = request(schema, { method: 'GET', url: '/api/thing' })
    await expect(failure).rejects.toBeInstanceOf(ApiError)
    await expect(failure).rejects.toMatchObject({
      status: 0,
      code: 'unexpected_response',
      message: 'Something went wrong on our side. Please try again in a moment.',
    })
    expect(log).toHaveBeenCalledWith(
      '[api] response did not match its schema',
      expect.objectContaining({ url: '/api/thing' }),
    )
  })

  it('stays quiet about a mismatch outside development', async () => {
    vi.stubEnv('DEV', false)
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    mock.onGet('/api/thing').reply(200, 'not json')

    await expect(request(schema, { method: 'GET', url: '/api/thing' })).rejects.toMatchObject({
      message: 'Something went wrong on our side. Please try again in a moment.',
    })
    expect(log).not.toHaveBeenCalled()
  })

  describe('on a connection that drops a request', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    /** Runs a request while the clock moves on, so its waits go by. */
    async function settle<T>(pending: Promise<T>): Promise<T> {
      const outcome = pending.then(
        (value) => ({ value }),
        (error: unknown) => ({ error }),
      )
      await vi.runAllTimersAsync()
      const result = await outcome
      if ('error' in result) throw result.error
      return result.value
    }

    it.each(['PUT', 'PATCH', 'DELETE'] as const)(
      'sends a %s again after 1 and 2 seconds, and keeps the answer that came',
      async (method) => {
        mock
          .onAny('/api/thing')
          .networkErrorOnce()
          .onAny('/api/thing')
          .networkErrorOnce()
          .onAny('/api/thing')
          .reply(200, { data: { id: 7 } })

        await expect(settle(request(schema, { method, url: '/api/thing' }))).resolves.toEqual({
          data: { id: 7 },
        })
        expect(mock.history[method.toLowerCase() as 'put' | 'patch' | 'delete']).toHaveLength(3)
        expect(RESEND_AFTER).toEqual([1_000, 2_000])
      },
    )

    it('gives up after two more tries, as a connection error', async () => {
      mock.onPut('/api/thing').networkError()

      await expect(
        settle(request(schema, { method: 'PUT', url: '/api/thing' })),
      ).rejects.toMatchObject({
        status: 0,
        code: 'network_error',
        message: 'We could not connect. Check your internet and try again.',
      })
      expect(mock.history.put).toHaveLength(3)
    })

    it('never sends a create twice, so nothing is made twice', async () => {
      mock.onPost('/api/thing').networkError()

      await expect(
        settle(request(schema, { method: 'POST', url: '/api/thing' })),
      ).rejects.toMatchObject({
        code: 'network_error',
      })
      expect(mock.history.post).toHaveLength(1)
    })

    it('leaves reading again to TanStack Query', async () => {
      mock.onGet('/api/thing').networkError()

      await expect(
        settle(request(schema, { method: 'GET', url: '/api/thing' })),
      ).rejects.toBeInstanceOf(ApiError)
      expect(mock.history.get).toHaveLength(1)
    })

    it('does not send again a write the server answered, even with a failure', async () => {
      mock.onPatch('/api/thing').reply(500, { message: 'Down', code: 'server_error' })

      await expect(
        settle(request(schema, { method: 'PATCH', url: '/api/thing' })),
      ).rejects.toMatchObject({
        status: 500,
      })
      expect(mock.history.patch).toHaveLength(1)
    })
  })

  it('hands back a request the app called off as it came, never as a connection error', async () => {
    const controller = new AbortController()
    controller.abort()
    mock.onPut('/api/thing').reply(200, { data: { id: 1 } })

    const error: unknown = await request(schema, {
      method: 'PUT',
      url: '/api/thing',
      signal: controller.signal,
    }).catch((reason: unknown) => reason)

    expect(axios.isCancel(error)).toBe(true)
    expect(error).not.toBeInstanceOf(ApiError)
    // Called off, not dropped: it is not sent again.
    expect(mock.history.put).toHaveLength(0)
  })
})
