import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'

let mock: MockAdapter

const tokenHeader = (index: number, method: 'post' | 'put' | 'get' = 'post') =>
  mock.history[method][index]!.headers?.['X-CSRF-TOKEN']

describe('installCsrfInterceptor', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
    resetCsrfToken(api)
    installCsrfInterceptor(api)
  })

  afterEach(() => {
    mock.restore()
    api.interceptors.request.clear()
    api.interceptors.response.clear()
    resetCsrfToken(api)
  })

  it('leaves reads alone', async () => {
    mock.onGet('/api/user').reply(200, {})

    await api.get('/api/user')
    await api.request({ url: '/api/user' })

    expect(mock.history.get.map((r) => r.url)).toEqual(['/api/user', '/api/user'])
    expect(tokenHeader(0, 'get')).toBeUndefined()
  })

  it('primes the token once for parallel writes and sends it on each', async () => {
    mock.onGet('/api/csrf-token').reply(200, { token: 'first' })
    mock.onPost('/api/dishes').reply(201, {})
    mock.onPut('/api/dishes/1').reply(200, {})

    await Promise.all([api.post('/api/dishes', {}), api.put('/api/dishes/1', {})])
    await api.post('/api/dishes', {})

    expect(mock.history.get.filter((r) => r.url === '/api/csrf-token')).toHaveLength(1)
    expect(tokenHeader(0)).toBe('first')
    expect(tokenHeader(1)).toBe('first')
    expect(tokenHeader(0, 'put')).toBe('first')
  })

  it('does not ask for a token to write the token endpoint itself', async () => {
    mock.onPost('/api/csrf-token').reply(200, {})

    await api.post('/api/csrf-token')

    expect(mock.history.get).toHaveLength(0)
    expect(tokenHeader(0)).toBeUndefined()
  })

  it('on a 419, drops the token, fetches a fresh one and retries once', async () => {
    let tokens = 0
    mock.onGet('/api/csrf-token').reply(() => [200, { token: `token-${++tokens}` }])
    // The retry reuses the request's config, so read each attempt's token as it is sent.
    const sent: unknown[] = []
    mock.onPost('/api/dishes').replyOnce((config) => {
      sent.push(config.headers?.['X-CSRF-TOKEN'])
      return [419, { message: 'CSRF token mismatch.' }]
    })
    mock.onPost('/api/dishes').replyOnce((config) => {
      sent.push(config.headers?.['X-CSRF-TOKEN'])
      return [201, { data: 'saved' }]
    })

    const response = await api.post('/api/dishes', {})

    expect(response.data).toEqual({ data: 'saved' })
    expect(mock.history.post).toHaveLength(2)
    expect(sent).toEqual(['token-1', 'token-2'])
    expect(api.defaults.headers.common['X-CSRF-TOKEN']).toBe('token-2')
  })

  it('gives up on a second 419 instead of looping', async () => {
    mock.onGet('/api/csrf-token').reply(200, { token: 'stale' })
    mock.onPost('/api/dishes').reply(419, { message: 'CSRF token mismatch.' })

    await expect(api.post('/api/dishes', {})).rejects.toMatchObject({
      response: { status: 419 },
    })
    expect(mock.history.post).toHaveLength(2)
  })

  it('passes every other failure straight through', async () => {
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
    mock.onPost('/api/dishes').reply(422, { message: 'Invalid' })
    mock.onGet('/api/offline').networkError()

    await expect(api.post('/api/dishes', {})).rejects.toMatchObject({
      response: { status: 422 },
    })
    await expect(api.get('/api/offline')).rejects.toThrow('Network Error')
    expect(mock.history.post).toHaveLength(1)
  })

  it('rethrows a 419 that carries no request to retry', async () => {
    // Response handlers run in the order they were added, so this one, added
    // first, hands the csrf handler a 419 without its config.
    api.interceptors.response.clear()
    api.interceptors.request.clear()
    api.interceptors.response.use(undefined, (error: { config?: unknown }) => {
      delete error.config
      throw error
    })
    installCsrfInterceptor(api)
    mock.onGet('/api/user').reply(419)

    await expect(api.get('/api/user')).rejects.toMatchObject({ response: { status: 419 } })
    expect(mock.history.get.filter((r) => r.url === '/api/csrf-token')).toHaveLength(0)
  })

  it('forgets the cached token on reset', async () => {
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
    mock.onPost('/api/dishes').reply(201, {})
    await api.post('/api/dishes', {})

    resetCsrfToken(api)

    expect(api.defaults.headers.common['X-CSRF-TOKEN']).toBeUndefined()
  })

  it('treats a request with no method as a read', async () => {
    // axios fills the method in before interceptors run, so the handler is
    // called directly to check its own default.
    const manager = api.interceptors.request as unknown as {
      handlers: Array<{
        fulfilled: (config: InternalAxiosRequestConfig) => Promise<InternalAxiosRequestConfig>
      } | null>
    }
    const handler = manager.handlers.find((entry) => entry !== null)!
    const config = { url: '/api/dishes', headers: new AxiosHeaders() }

    await expect(handler.fulfilled(config)).resolves.toBe(config)
    expect(config.headers.has('X-CSRF-TOKEN')).toBe(false)
    expect(mock.history.get).toHaveLength(0)
  })
})
