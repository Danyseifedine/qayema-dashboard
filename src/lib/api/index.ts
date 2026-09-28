import { api } from '@/lib/api/client'
import { installAuthRedirectInterceptor } from '@/lib/api/interceptors/auth-redirect'
import { installCsrfInterceptor } from '@/lib/api/interceptors/csrf'
import { installLocaleInterceptor } from '@/lib/api/interceptors/locale'

let installed = false

/**
 * Wires the interceptors onto the shared client. Called once at boot; guarded
 * so a hot reload cannot stack duplicate handlers.
 */
export function configureApi(): void {
  if (installed) return
  installed = true

  installLocaleInterceptor(api)
  installCsrfInterceptor(api)
  installAuthRedirectInterceptor(api)
}

export { request } from '@/lib/api/request'
