import {
  ChartNoAxesColumn,
  Crown,
  LayoutDashboard,
  LayoutList,
  type LucideIcon,
  Palette,
  QrCode,
  ReceiptText,
  Store,
  SwatchBook,
  Share2,
  ToggleRight,
  UserRound,
  UtensilsCrossed,
} from 'lucide-react'
import type { Plan } from '@/features/auth'
import type common from '@/locales/en/common.json'

/** The plan flags a section can be gated on, as `/api/user` reports them. */
type PlanFlag = keyof Plan

/**
 * A section's name, as a key into `common.json`. The table below is built at
 * module load, so it holds keys and the sidebar translates them at render;
 * translating here would freeze the names in whatever language loaded first.
 */
type NavLabelKey = `nav.${keyof typeof common.nav}`

export type NavItem = {
  /** Stable id: the page `App.tsx` shows, and the feature folder's name. */
  key: string
  labelKey: NavLabelKey
  icon: LucideIcon
  /** Locked until the owner has picked a design. */
  requiresTemplate?: boolean
  /** Locked unless the restaurant's plan includes the flag. */
  requiresPlan?: PlanFlag
  /**
   * Leaves the sidebar when the owner switches its feature off on the
   * Features page (same key in `Restaurant::OPTIONAL_FEATURES`, ../qayema).
   */
  hideable?: true
}

export type NavGroup = {
  key: string
  /** Omitted for the first group, which needs no heading. */
  labelKey?: NavLabelKey
  items: NavItem[]
}

/**
 * The sidebar, grouped by what the owner is doing: looking at the numbers,
 * building the menu, reaching guests, or setting the restaurant up. Keys are
 * the feature folders under `src/features/`. Anything that works on the menu
 * itself only unlocks once a design is chosen (`requiresTemplate`).
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'main',
    items: [
      { key: 'overview', labelKey: 'nav.overview', icon: LayoutDashboard },
      {
        key: 'analytics',
        labelKey: 'nav.analytics',
        icon: ChartNoAxesColumn,
        requiresPlan: 'analytics',
        hideable: true,
      },
    ],
  },
  {
    key: 'menu',
    labelKey: 'nav.menu',
    items: [
      { key: 'categories', labelKey: 'nav.categories', icon: LayoutList, requiresTemplate: true },
      { key: 'dishes', labelKey: 'nav.dishes', icon: UtensilsCrossed, requiresTemplate: true },
      // Always open: it is how an owner gets out of the locked state.
      { key: 'design', labelKey: 'nav.design', icon: Palette },
      // Its settings are the design's, so it waits for one to be chosen.
      {
        key: 'appearance',
        labelKey: 'nav.appearance',
        icon: SwatchBook,
        requiresTemplate: true,
        requiresPlan: 'appearance',
      },
    ],
  },
  {
    key: 'guests',
    labelKey: 'nav.guests',
    items: [
      {
        key: 'orders',
        labelKey: 'nav.orders',
        icon: ReceiptText,
        requiresTemplate: true,
        requiresPlan: 'ordering',
        hideable: true,
      },
      // Always open: the plain code is every restaurant's. The studio's
      // styling is what the plan and the Features switch decide.
      { key: 'qr', labelKey: 'nav.qr', icon: QrCode, requiresTemplate: true },
      { key: 'social-links', labelKey: 'nav.socialLinks', icon: Share2 },
    ],
  },
  {
    key: 'settings',
    labelKey: 'nav.settings',
    items: [
      { key: 'restaurant', labelKey: 'nav.restaurant', icon: Store, requiresTemplate: true },
      { key: 'features', labelKey: 'nav.features', icon: ToggleRight },
      { key: 'package', labelKey: 'nav.package', icon: Crown },
    ],
  },
]

/**
 * The owner's own account is a page too, but it is about the person, not the
 * restaurant, so it opens from the avatar menu rather than the sidebar.
 */
const ACCOUNT_ITEM: NavItem = { key: 'account', labelKey: 'nav.account', icon: UserRound }

/** Every page, flattened, for lookups by key. */
export const NAV_ITEMS: NavItem[] = [...NAV_GROUPS.flatMap((group) => group.items), ACCOUNT_ITEM]

/** The sections an owner can switch off, in sidebar order. */
const HIDEABLE_ITEMS: NavItem[] = NAV_ITEMS.filter((item) => item.hideable)

/** Whether the owner switched this section off. Only hideable sections can be. */
export function isNavItemHidden(key: string, off: readonly string[]): boolean {
  return off.includes(key) && HIDEABLE_ITEMS.some((item) => item.key === key)
}

export type NavAccess = {
  hasTemplate: boolean
  plan: Plan
}

/**
 * Why a section is closed to this owner, or null when it is open.
 *
 * `template`: nothing to work on until a design is chosen, so the row is
 * disabled. `plan`: the package does not include it, so the row stays open and
 * the page shows what it would give and which package has it.
 *
 * The sidebar and the page body both read this, so a locked row can never sit
 * next to a rendered page, which is exactly the mismatch that let the app open
 * on a section the owner could not use.
 */
export type NavLock = 'template' | 'plan' | null

export function navLock(key: string, access: NavAccess): NavLock {
  const item = NAV_ITEMS.find((candidate) => candidate.key === key)
  if (!item) return null

  if (item.requiresTemplate === true && !access.hasTemplate) return 'template'
  // Data-driven, so gating a new section on a new flag is one line in the
  // table above rather than another branch here.
  if (item.requiresPlan !== undefined && !access.plan[item.requiresPlan]) return 'plan'

  return null
}
