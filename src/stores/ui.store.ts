import { create } from 'zustand'

const COLLAPSED_KEY = 'qayema.dashboard.sidebar.collapsed.v1'
const GUIDE_KEY = 'qayema.dashboard.overview.guide-hidden.v1'

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function persistFlag(key: string, on: boolean): void {
  try {
    localStorage.setItem(key, on ? '1' : '0')
  } catch {
    // Blocked site data simply loses the preference.
  }
}

type UiState = {
  /** Desktop: the sidebar shrinks to an icon rail. */
  sidebarCollapsed: boolean
  /** Mobile: the sidebar slides in over the content. */
  mobileNavOpen: boolean
  /** The Overview's "How it works" guide, put away by the owner. */
  guideHidden: boolean
  toggleSidebar: () => void
  setMobileNavOpen: (open: boolean) => void
  setGuideHidden: (hidden: boolean) => void
}

export const useUiStore = create<UiState>((set, get) => ({
  sidebarCollapsed: readFlag(COLLAPSED_KEY),
  mobileNavOpen: false,
  guideHidden: readFlag(GUIDE_KEY),
  toggleSidebar: () => {
    const next = !get().sidebarCollapsed
    persistFlag(COLLAPSED_KEY, next)
    set({ sidebarCollapsed: next })
  },
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  setGuideHidden: (hidden) => {
    persistFlag(GUIDE_KEY, hidden)
    set({ guideHidden: hidden })
  },
}))
