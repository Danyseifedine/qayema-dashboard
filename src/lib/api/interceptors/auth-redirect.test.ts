import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installAuthRedirectInterceptor } from '@/lib/api/interceptors/auth-redirect'
import { safeRedirect } from '@/lib/security/safe-redirect'

vi.mock('@/lib/security/safe-redirect', () => ({ safeRedirect: vi.fn(() => true) }))

describe('installAuthRedirectInterceptor', () => {
  const client = axios.create()
  let mock: MockAdapter

  beforeEach(() => {
    mock = new MockAdapter(client)
  })

  afterEach(() => {
    mock.restore()
    client.interceptors.response.clear()
    vi.mocked(safeRedirect).mockClear()
  })

  it('leaves for the login page on the first 401 only', async () => {
    const onUnauthenticated = vi.fn()
    installAuthRedirectInterceptor(client, { onUnauthenticated })
    mock.onGet('/api/user').reply(401, { message: 'Unauthenticated.' })

    await expect(client.get('/api/user')).rejects.toMatchObject({ response: { status: 401 } })
    await expect(client.get('/api/user')).rejects.toMatchObject({ response: { status: 401 } })

    expect(onUnauthenticated).toHaveBeenCalledOnce()
    expect(safeRedirect).toHaveBeenCalledOnce()
    expect(safeRedirect).toHaveBeenCalledWith('https://qayema.test/get-started')
  })

  it('works without a callback', async () => {
    installAuthRedirectInterceptor(client)
    mock.onGet('/api/user').reply(401)

    await expect(client.get('/api/user')).rejects.toBeDefined()
    expect(safeRedirect).toHaveBeenCalledOnce()
  })

  it('does not navigate on a 403, another failure, or a success', async () => {
    installAuthRedirectInterceptor(client)
    mock.onGet('/api/forbidden').reply(403)
    mock.onGet('/api/broken').reply(500)
    mock.onGet('/api/offline').networkError()
    mock.onGet('/api/ok').reply(200, { ok: true })

    await expect(client.get('/api/forbidden')).rejects.toMatchObject({
      response: { status: 403 },
    })
    await expect(client.get('/api/broken')).rejects.toBeDefined()
    await expect(client.get('/api/offline')).rejects.toBeDefined()
    await expect(client.get('/api/ok')).resolves.toMatchObject({ data: { ok: true } })

    expect(safeRedirect).not.toHaveBeenCalled()
  })

  it('rethrows something that is not an axios error untouched', async () => {
    installAuthRedirectInterceptor(client)
    client.interceptors.request.use(() => {
      throw new Error('not axios')
    })

    await expect(client.get('/api/user')).rejects.toThrow('not axios')
    expect(safeRedirect).not.toHaveBeenCalled()
    client.interceptors.request.clear()
  })
})
