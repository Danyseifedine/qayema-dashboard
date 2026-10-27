import { useCallback, useEffect, useState } from 'react'
import { isNavKey, type NavKey } from '@/app/layouts/authenticated/nav-items'

const BASE = import.meta.env.BASE_URL

/** "/categories" → "categories"; null for "/" or a path that is no page. */
export function pageKeyFromPath(pathname: string): NavKey | null {
  const rest = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname
  const key = rest.replace(/^\/+|\/+$/g, '')
  return isNavKey(key) ? key : null
}

function pathOf(key: string): string {
  return `${BASE}${key}`
}

/**
 * Keeps the page as tall as it is while the next one draws: a page still
 * loading is short, and the browser would cut the scroll to its end at once
 * instead of letting it glide up from where the owner was.
 */
function holdHeight() {
  if (window.scrollY === 0) return
  const root = document.documentElement
  root.style.minHeight = `${root.scrollHeight}px`
}

/**
 * Which page is open, kept in the URL: each nav key is a path
 * (`/categories`), so a refresh or a shared link opens the same page and the
 * browser's back and forward buttons move between pages.
 *
 * `landing` is the page for "/" or a path that is no page; the URL is
 * rewritten to it, so it always names what is on screen.
 */
export function usePageKey(landing: NavKey) {
  const [key, setKey] = useState<NavKey>(() => pageKeyFromPath(window.location.pathname) ?? landing)

  useEffect(() => {
    if (pageKeyFromPath(window.location.pathname) === null) {
      window.history.replaceState(null, '', pathOf(key))
    }
  }, [key])

  // Every page opens at its top, gliding there from wherever the last one
  // was left, whether it was chosen or reached with back. The browser's own
  // restoring would jump to an old offset instead, so it is switched off.
  useEffect(() => {
    window.history.scrollRestoration = 'manual'
  }, [])

  useEffect(() => {
    const release = () => {
      document.documentElement.style.removeProperty('min-height')
    }
    if (window.scrollY === 0) {
      release()
      return
    }

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: still ? 'auto' : 'smooth' })
    // The height is let go once the glide ends; a browser without the event
    // lets it go after a second, longer than any glide.
    window.addEventListener('scrollend', release, { once: true })
    const fallback = window.setTimeout(release, 1000)
    return () => {
      window.removeEventListener('scrollend', release)
      window.clearTimeout(fallback)
    }
  }, [key])

  useEffect(() => {
    const onPop = () => {
      holdHeight()
      setKey(pageKeyFromPath(window.location.pathname) ?? landing)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [landing])

  /** `replace` swaps the current history entry, for a page handed over rather than chosen. */
  const open = useCallback((next: NavKey, { replace = false } = {}) => {
    if (window.location.pathname !== pathOf(next)) {
      holdHeight()
      window.history[replace ? 'replaceState' : 'pushState'](null, '', pathOf(next))
    }
    setKey(next)
  }, [])

  return [key, open] as const
}
