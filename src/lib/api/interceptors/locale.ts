import type { AxiosInstance } from 'axios'
import { i18n } from '@/lib/i18n'

/**
 * Tells the server which language the dashboard is showing, so validation
 * errors and other messages come back in it.
 */
export function installLocaleInterceptor(client: AxiosInstance): void {
  client.interceptors.request.use((config) => {
    config.headers.set('Accept-Language', i18n.language)
    return config
  })
}
