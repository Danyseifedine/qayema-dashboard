import axios from 'axios'
import { env } from '@/config/env'

/**
 * The one axios instance that talks to the Laravel API.
 *
 * - `withCredentials` sends the Sanctum session cookie cross-origin.
 * - `withXSRFToken` echoes the `XSRF-TOKEN` cookie when axios can read it,
 *   which it can only on a same-domain setup. Cross-domain we read the token
 *   from the body instead; see `./interceptors/csrf`.
 * - `Accept: application/json` makes Laravel return JSON 401s rather than a
 *   redirect to the login page.
 */
export const api = axios.create({
  baseURL: env.VITE_API_URL,
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})
