import {
  Crown,
  LayoutDashboard,
  LayoutList,
  type LucideIcon,
  Palette,
  QrCode,
  ReceiptText,
  Store,
  Share2,
  UserRound,
  UtensilsCrossed,
} from 'lucide-react'

/** The package flags a section can be gated on, as `/api/user` reports them. */
export type PlanFeature = 'qr_studio' | 'ordering' | 'advanced_analytics'

export type NavItem = {
  /** Stable id, and the route path once the router is wired up. */
  key: string
  path: string
  label: string
  icon: LucideIcon
  /** Hidden until the owner has picked a template. */
  requiresTemplate?: boolean
  /** Hidden unless the restaurant's plan includes the feature. */
  requiresFeature?: PlanFeature
}

export type NavGroup = {
  key: string
  /** Omitted for the first group, which needs no heading. */
  label?: string
  items: NavItem[]
}

/**
 * The dashboard's navigation, one entry per surface in
 * ../qayema/routes/api.php. Menu, templates settings and the QR studio only
 * unlock once a template is chosen, which is what `requiresTemplate` gates.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'main',
    items: [
      { key: 'overview', path: '/', label: 'Overview', icon: LayoutDashboard },
      {
        key: 'categories',
        path: '/menu/categories',
        label: 'Categories',
        icon: LayoutList,
        requiresTemplate: true,
      },
      {
        key: 'dishes',
        path: '/menu/dishes',
        label: 'Dishes',
        icon: UtensilsCrossed,
        requiresTemplate: true,
      },
      {
        key: 'orders',
        path: '/orders',
        label: 'Orders',
        icon: ReceiptText,
        requiresTemplate: true,
        requiresFeature: 'ordering',
      },
      { key: 'templates', path: '/templates', label: 'Templates', icon: Palette },
    ],
  },
  {
    key: 'reach',
    label: 'Reach',
    items: [
      {
        key: 'qr',
        path: '/qr',
        label: 'QR Studio',
        icon: QrCode,
        requiresTemplate: true,
        requiresFeature: 'qr_studio',
      },
      { key: 'social-links', path: '/social-links', label: 'Social links', icon: Share2 },
    ],
  },
  {
    key: 'account',
    label: 'Account',
    items: [
      { key: 'package', path: '/package', label: 'Package', icon: Crown },
      {
        key: 'settings',
        path: '/settings',
        label: 'Restaurant',
        icon: Store,
        requiresTemplate: true,
      },
      { key: 'account', path: '/account', label: 'Profile', icon: UserRound },
    ],
  },
]

/** Every item, flattened, for lookups by key. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items)

export type NavAccess = {
  hasTemplate: boolean
  features: Record<PlanFeature, boolean>
}

/**
 * Whether a section is closed to this owner.
 *
 * The sidebar and the page body both read this, so a locked row can never sit
 * next to a rendered page, which is exactly the mismatch that let the app open
 * on a section the owner could not use.
 */
export function isNavItemLocked(key: string, access: NavAccess): boolean {
  const item = NAV_ITEMS.find((candidate) => candidate.key === key)
  if (!item) return false

  if (item.requiresTemplate === true && !access.hasTemplate) return true
  // Data-driven, so gating a new section on a new flag is one line in the
  // table above rather than another branch here.
  if (item.requiresFeature !== undefined && !access.features[item.requiresFeature]) return true

  return false
}
