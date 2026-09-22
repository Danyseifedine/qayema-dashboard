import { env } from '@/config/env'

/**
 * Allow-list for outbound navigation.
 *
 * Only the API origin and our own origin are acceptable targets, so a value
 * that reaches this from a query string or an API payload cannot bounce the
 * owner to an attacker's page.
 */
function isAllowed(target: URL): boolean {
  const allowed = [new URL(env.VITE_API_URL).origin, window.location.origin]
  return allowed.includes(target.origin)
}

/** Resolves a URL when it is safe to navigate to, otherwise null. */
export function resolveSafeRedirect(raw: string): URL | null {
  let target: URL
  try {
    target = new URL(raw, window.location.origin)
  } catch {
    return null
  }

  if (target.protocol !== 'https:' && target.protocol !== 'http:') return null

  return isAllowed(target) ? target : null
}

/** Navigates only if the target passes the allow-list. */
export function safeRedirect(raw: string): boolean {
  const target = resolveSafeRedirect(raw)
  if (!target) return false

  window.location.assign(target.toString())
  return true
}
