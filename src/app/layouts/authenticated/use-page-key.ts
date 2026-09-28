import { useCallback, useEffect, useState } from 'react'
import { NAV_ITEMS } from '@/app/layouts/authenticated/nav-items'

const BASE = import.meta.env.BASE_URL

/** "/categories" → "categories"; null for "/" or a path that is no page. */
export function pageKeyFromPath(pathname: string): string | null {
  const rest = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname
  const key = rest.replace(/^\/+|\/+$/g, '')
  return NAV_ITEMS.some((item) => item.key === key) ? key : null
}

function pathOf(key: string): string {
  return `${BASE}${key}`
}

/**
 * Which page is open, kept in the URL: each nav key is a path
 * (`/categories`), so a refresh or a shared link opens the same page and the
 * browser's back and forward buttons move between pages.
 *
 * `landing` is the page for "/" or a path that is no page; the URL is
 * rewritten to it, so it always names what is on screen.
 */
export function usePageKey(landing: string) {
  const [key, setKey] = useState(() => pageKeyFromPath(window.location.pathname) ?? landing)

  useEffect(() => {
    if (pageKeyFromPath(window.location.pathname) === null) {
      window.history.replaceState(null, '', pathOf(key))
    }
  }, [key])

  useEffect(() => {
    const onPop = () => setKey(pageKeyFromPath(window.location.pathname) ?? landing)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [landing])

  /** `replace` swaps the current history entry, for a page handed over rather than chosen. */
  const open = useCallback((next: string, { replace = false } = {}) => {
    if (window.location.pathname !== pathOf(next)) {
      window.history[replace ? 'replaceState' : 'pushState'](null, '', pathOf(next))
    }
    setKey(next)
  }, [])

  return [key, open] as const
}
