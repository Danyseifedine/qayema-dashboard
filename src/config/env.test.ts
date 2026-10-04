import { afterEach, describe, expect, it, vi } from 'vitest'

// `env.ts` validates at import time, so each case re-imports it fresh.
async function loadEnv() {
  vi.resetModules()
  return import('@/config/env')
}

describe('env', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('reads the API and login URLs, dropping trailing slashes from the API', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.qayema.test//')
    vi.stubEnv('VITE_LOGIN_URL', 'https://api.qayema.test/get-started')
    // Set here, not left to whatever the local .env holds.
    vi.stubEnv('VITE_PUSHER_KEY', '')
    vi.stubEnv('VITE_PUSHER_CLUSTER', 'eu')

    const { env } = await loadEnv()

    expect(env).toEqual({
      VITE_API_URL: 'https://api.qayema.test',
      VITE_LOGIN_URL: 'https://api.qayema.test/get-started',
      // No key: orders are checked once a minute instead of live.
      VITE_PUSHER_KEY: undefined,
      VITE_PUSHER_CLUSTER: 'eu',
    })
  })

  it("reads Pusher's public key and cluster for live orders", async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.qayema.test')
    vi.stubEnv('VITE_LOGIN_URL', 'https://api.qayema.test/get-started')
    vi.stubEnv('VITE_PUSHER_KEY', 'public-key')
    vi.stubEnv('VITE_PUSHER_CLUSTER', 'mt1')

    const { env } = await loadEnv()

    expect(env.VITE_PUSHER_KEY).toBe('public-key')
    expect(env.VITE_PUSHER_CLUSTER).toBe('mt1')
  })

  it('fails loudly at boot, naming every bad value', async () => {
    vi.stubEnv('VITE_API_URL', 'qayema.test')
    vi.stubEnv('VITE_LOGIN_URL', '')

    await expect(loadEnv()).rejects.toThrow(
      /Invalid environment configuration:\n {2}VITE_API_URL: VITE_API_URL must be an absolute URL, e\.g\. https:\/\/qayema\.test\n {2}VITE_LOGIN_URL: VITE_LOGIN_URL must be an absolute URL/,
    )
  })
})
