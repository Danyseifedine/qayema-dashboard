import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const KEY = 'qayema.dashboard.sidebar.collapsed.v1'

// The store reads storage when it is created, so each case loads it fresh.
async function loadStore() {
  vi.resetModules()
  const { useUiStore } = await import('@/stores/ui.store')
  return useUiStore
}

describe('useUiStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('starts expanded, with the drawer closed', async () => {
    const store = await loadStore()

    expect(store.getState().sidebarCollapsed).toBe(false)
    expect(store.getState().mobileNavOpen).toBe(false)
  })

  it('remembers a collapsed sidebar across loads', async () => {
    let store = await loadStore()
    store.getState().toggleSidebar()

    expect(store.getState().sidebarCollapsed).toBe(true)
    expect(localStorage.getItem(KEY)).toBe('1')

    store = await loadStore()
    expect(store.getState().sidebarCollapsed).toBe(true)

    store.getState().toggleSidebar()
    expect(localStorage.getItem(KEY)).toBe('0')
  })

  it('opens and closes the mobile drawer', async () => {
    const store = await loadStore()

    store.getState().setMobileNavOpen(true)
    expect(store.getState().mobileNavOpen).toBe(true)
    store.getState().setMobileNavOpen(false)
    expect(store.getState().mobileNavOpen).toBe(false)
  })

  it('works, without remembering, when storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })

    const store = await loadStore()
    expect(store.getState().sidebarCollapsed).toBe(false)

    expect(() => store.getState().toggleSidebar()).not.toThrow()
    expect(store.getState().sidebarCollapsed).toBe(true)
  })
})
