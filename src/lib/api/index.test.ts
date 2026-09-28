import { afterEach, describe, expect, it, vi } from 'vitest'

describe('configureApi', () => {
  afterEach(() => {
    vi.resetModules()
    vi.doUnmock('@/lib/api/interceptors/auth-redirect')
    vi.doUnmock('@/lib/api/interceptors/csrf')
    vi.doUnmock('@/lib/api/interceptors/locale')
  })

  it('installs each interceptor once, however often it is called', async () => {
    vi.resetModules()
    const installAuth = vi.fn()
    const installCsrf = vi.fn()
    const installLocale = vi.fn()
    vi.doMock('@/lib/api/interceptors/auth-redirect', () => ({
      installAuthRedirectInterceptor: installAuth,
    }))
    vi.doMock('@/lib/api/interceptors/csrf', () => ({ installCsrfInterceptor: installCsrf }))
    vi.doMock('@/lib/api/interceptors/locale', () => ({
      installLocaleInterceptor: installLocale,
    }))

    const { configureApi, request } = await import('@/lib/api')
    const { api } = await import('@/lib/api/client')

    configureApi()
    configureApi()

    expect(installLocale).toHaveBeenCalledOnce()
    expect(installLocale).toHaveBeenCalledWith(api)
    expect(installCsrf).toHaveBeenCalledOnce()
    expect(installAuth).toHaveBeenCalledOnce()
    expect(installAuth).toHaveBeenCalledWith(api)
    expect(typeof request).toBe('function')
  })
})
