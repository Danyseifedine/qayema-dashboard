import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { api } from '@/lib/api/client'
import { request } from '@/lib/api/request'
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
      code: 'unknown_error',
      message: 'The server sent an unexpected response.',
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
      message: 'The server sent an unexpected response.',
    })
    expect(log).not.toHaveBeenCalled()
  })
})
