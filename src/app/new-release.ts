/** Not twice in this long: a release that is really broken must not loop. */
const AGAIN_AFTER = 30_000
const KEY = 'qayema-reloaded-at'

/**
 * A tab opened before a release asks for page files that release replaced,
 * and the server no longer has them: Vite says so (`vite:preloadError`)
 * and the tab loads the new release instead of breaking where it stands.
 */
export function reloadOnNewRelease(target: Window = window): void {
  target.addEventListener('vite:preloadError', (event) => {
    let last = 0
    try {
      last = Number(target.sessionStorage.getItem(KEY)) || 0
      if (Date.now() - last < AGAIN_AFTER) return
      target.sessionStorage.setItem(KEY, String(Date.now()))
    } catch {
      // No storage (a private window): reload anyway, once per event.
    }
    event.preventDefault()
    target.location.reload()
  })
}
