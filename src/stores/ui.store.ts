import { create } from 'zustand'

const COLLAPSED_KEY = 'qayema.dashboard.sidebar.collapsed.v1'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

function persistCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0')
  } catch {
    // Blocked site data simply loses the preference.
  }
}

type UiState = {
  /** Desktop: the sidebar shrinks to an icon rail. */
  sidebarCollapsed: boolean
  /** Mobile: the sidebar slides in over the content. */
  mobileNavOpen: boolean
  toggleSidebar: () => void
  setMobileNavOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>((set, get) => ({
  sidebarCollapsed: readCollapsed(),
  mobileNavOpen: false,
  toggleSidebar: () => {
    const next = !get().sidebarCollapsed
    persistCollapsed(next)
    set({ sidebarCollapsed: next })
  },
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
}))
