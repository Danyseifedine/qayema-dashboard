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
  /** The Overview's "How it works" guide, put away by the owner. */
  guideHidden: boolean
  /**
   * A dish whose builds the Build your own page brings into view as it
   * opens (the dish window's way there); null once shown. Not remembered.
   */
  buildsDishId: number | null
  /**
   * An offer the Offers page opens in its editor as it opens (a deal dish's
   * window's way there); null once open. Not remembered.
   */
  offerToEdit: number | null
  toggleSidebar: () => void
  setGuideHidden: (hidden: boolean) => void
  showBuildsOf: (dishId: number | null) => void
  editOffer: (offerId: number | null) => void
}

export const useUiStore = create<UiState>((set, get) => ({
  sidebarCollapsed: readFlag(COLLAPSED_KEY),
  guideHidden: readFlag(GUIDE_KEY),
  buildsDishId: null,
  offerToEdit: null,
  toggleSidebar: () => {
    const next = !get().sidebarCollapsed
    persistFlag(COLLAPSED_KEY, next)
    set({ sidebarCollapsed: next })
  },
  setGuideHidden: (hidden) => {
    persistFlag(GUIDE_KEY, hidden)
    set({ guideHidden: hidden })
  },
  showBuildsOf: (dishId) => set({ buildsDishId: dishId }),
  editOffer: (offerId) => set({ offerToEdit: offerId }),
}))
