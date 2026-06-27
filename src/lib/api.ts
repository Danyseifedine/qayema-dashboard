import axios from 'axios'

/**
 * Single axios instance for talking to the Laravel API.
 *
 * - `withCredentials` sends the session cookie cross-origin (dashboard → API).
 * - `withXSRFToken` makes axios echo the `XSRF-TOKEN` cookie as `X-XSRF-TOKEN`
 *   when it CAN read it (same-domain setup). Cross-domain it can't, so we also
 *   fetch the token from the body and set it as `X-CSRF-TOKEN` (see below).
 * - `Accept: application/json` forces Laravel to return JSON 401s instead of a
 *   redirect to the login page.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

/**
 * Prime CSRF for state-changing requests. We read the current session's token
 * from the response body — which a cross-domain SPA CAN read (the XSRF-TOKEN
 * cookie it can't) — and send it as the `X-CSRF-TOKEN` header on later writes.
 * Works for both same-domain and cross-domain dashboards.
 */
export async function ensureCsrfToken(): Promise<void> {
  const { data } = await api.get('/api/csrf-token')
  api.defaults.headers.common['X-CSRF-TOKEN'] = data.token as string
}

export default api
