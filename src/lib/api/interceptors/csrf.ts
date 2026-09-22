import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import axios from 'axios'

const CSRF_ENDPOINT = '/api/csrf-token'
const WRITE_METHODS = new Set(['post', 'put', 'patch', 'delete'])

/** In-flight token fetch, shared so parallel writes prime CSRF only once. */
let priming: Promise<string> | null = null

type RetriedConfig = InternalAxiosRequestConfig & { csrfRetried?: boolean }

async function fetchToken(client: AxiosInstance): Promise<string> {
  const { data } = await client.get<{ token: string }>(CSRF_ENDPOINT)
  return data.token
}

async function primeToken(client: AxiosInstance): Promise<string> {
  priming ??= fetchToken(client).finally(() => {
    priming = null
  })

  const token = await priming
  client.defaults.headers.common['X-CSRF-TOKEN'] = token
  return token
}

/**
 * Keeps the CSRF token fresh for state-changing requests.
 *
 * A cross-subdomain SPA cannot read the `XSRF-TOKEN` cookie, so the token is
 * read from the body of `GET /api/csrf-token` and sent as `X-CSRF-TOKEN`. It
 * is fetched lazily before the first write, and once more if the session
 * rotates the token and the server answers 419.
 */
export function installCsrfInterceptor(client: AxiosInstance): void {
  client.interceptors.request.use(async (config) => {
    const method = (config.method ?? 'get').toLowerCase()
    if (!WRITE_METHODS.has(method)) return config
    if (config.url === CSRF_ENDPOINT) return config

    if (!client.defaults.headers.common['X-CSRF-TOKEN']) {
      await primeToken(client)
    }

    config.headers.set('X-CSRF-TOKEN', client.defaults.headers.common['X-CSRF-TOKEN'] as string)
    return config
  })

  client.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      if (!axios.isAxiosError(error) || error.response?.status !== 419) {
        throw error
      }

      const config = error.config as RetriedConfig | undefined
      // Retry a stale token exactly once, so a genuinely rejected request
      // cannot loop.
      if (!config || config.csrfRetried) {
        throw error
      }

      config.csrfRetried = true
      delete client.defaults.headers.common['X-CSRF-TOKEN']
      const token = await primeToken(client)
      config.headers.set('X-CSRF-TOKEN', token)

      return client.request(config)
    },
  )
}

/** Test seam: forget the cached token between cases. */
export function resetCsrfToken(client: AxiosInstance): void {
  delete client.defaults.headers.common['X-CSRF-TOKEN']
  priming = null
}
