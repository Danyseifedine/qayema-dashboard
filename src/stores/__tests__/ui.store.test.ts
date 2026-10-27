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

  it('starts expanded', async () => {
    const store = await loadStore()

    expect(store.getState().sidebarCollapsed).toBe(false)
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
  it('hands the Build your own page a dish to show, once, and never remembers it', async () => {
    const store = await loadStore()
    expect(store.getState().buildsDishId).toBeNull()

    store.getState().showBuildsOf(12)
    expect(store.getState().buildsDishId).toBe(12)
    store.getState().showBuildsOf(null)
    expect(store.getState().buildsDishId).toBeNull()
    expect(localStorage.length).toBe(0)
  })

  it('hands the Offers page an offer to open, once, and never remembers it', async () => {
    const store = await loadStore()
    expect(store.getState().offerToEdit).toBeNull()

    store.getState().editOffer(4)
    expect(store.getState().offerToEdit).toBe(4)
    store.getState().editOffer(null)
    expect(store.getState().offerToEdit).toBeNull()
    expect(localStorage.length).toBe(0)
  })
})
