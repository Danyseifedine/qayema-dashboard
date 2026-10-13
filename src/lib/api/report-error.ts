import { env } from '@/config/env'

/**
 * Tells the backend about an error an owner hit (`POST /api/client-errors`),
 * so it reaches the logs and Grafana like a server error: a page that broke
 * on render, a script error, a promise nobody caught. Our own backend only;
 * no third-party error telemetry.
 *
 * Plain `fetch`, never the axios client: a report must never toast, redirect
 * to the sign-in or be retried. No cookies go with it, `keepalive` lets it
 * finish while the page unloads, and anything going wrong here is dropped.
 */

/** At most this many from one page load: an error in a loop must not flood the server. */
const MAX_REPORTS = 5
const MESSAGE_LIMIT = 1000
const STACK_LIMIT = 4000

export type ErrorSource = 'render' | 'error' | 'rejection'

const sent = new Set<string>()

/** The release this tab runs: the hash in the name of the build's entry file. */
function currentRelease(): string {
  const entry = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/"]')
  return /-([\w-]{8})\.js$/.exec(entry?.src ?? '')?.[1] ?? 'dev'
}

export function reportError(error: unknown, source: ErrorSource, more?: string | null): void {
  const message = (
    error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  ).slice(0, MESSAGE_LIMIT)
  if (sent.size >= MAX_REPORTS || sent.has(message)) return
  sent.add(message)

  const stack = [error instanceof Error ? error.stack : undefined, more]
    .filter(Boolean)
    .join('\n')
    .slice(0, STACK_LIMIT)

  fetch(`${env.VITE_API_URL}/api/client-errors`, {
    method: 'POST',
    keepalive: true,
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      message,
      stack: stack || null,
      source,
      page: window.location.pathname,
      release: currentRelease(),
    }),
  }).catch(() => {})
}

/** Reports what nothing else caught: script errors and rejected promises. */
export function installErrorReporting(target: Window = window): void {
  target.addEventListener('error', (event) => {
    // A script from elsewhere (a browser extension) is not ours to report.
    if (event.filename && !event.filename.startsWith(target.location.origin)) return
    reportError(event.error ?? event.message, 'error')
  })
  target.addEventListener('unhandledrejection', (event) => {
    reportError(event.reason, 'rejection')
  })
}
