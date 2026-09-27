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
  Share2,
  ToggleRight,
  UserRound,
  UtensilsCrossed,
} from 'lucide-react'
import type common from '@/locales/en/common.json'

/** The package flags a section can be gated on, as `/api/user` reports them. */
export type PlanFeature = 'qr_studio' | 'ordering' | 'advanced_analytics'

/**
 * A section's name, as a key into `common.json`. The table below is built at
 * module load, so it holds keys and the sidebar translates them at render;
 * translating here would freeze the names in whatever language loaded first.
 */
export type NavLabelKey = `nav.${keyof typeof common.nav}`

export type NavItem = {
  /** Stable id, and the route path once the router is wired up. */
  key: string
  path: string
  labelKey: NavLabelKey
  icon: LucideIcon
  /** Hidden until the owner has picked a template. */
  requiresTemplate?: boolean
  /** Hidden unless the restaurant's plan includes the feature. */
  requiresFeature?: PlanFeature
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
 * The dashboard's navigation, one entry per surface in
 * ../qayema/routes/api.php. Menu, templates settings and the QR studio only
 * unlock once a template is chosen, which is what `requiresTemplate` gates.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'main',
    items: [
      { key: 'overview', path: '/', labelKey: 'nav.overview', icon: LayoutDashboard },
      {
        key: 'analytics',
        path: '/analytics',
        labelKey: 'nav.analytics',
        icon: ChartNoAxesColumn,
        hideable: true,
      },
      {
        key: 'categories',
        path: '/menu/categories',
        labelKey: 'nav.categories',
        icon: LayoutList,
        requiresTemplate: true,
      },
      {
        key: 'dishes',
        path: '/menu/dishes',
        labelKey: 'nav.dishes',
        icon: UtensilsCrossed,
        requiresTemplate: true,
      },
      {
        key: 'orders',
        path: '/orders',
        labelKey: 'nav.orders',
        icon: ReceiptText,
        requiresTemplate: true,
        requiresFeature: 'ordering',
        hideable: true,
      },
      { key: 'templates', path: '/templates', labelKey: 'nav.templates', icon: Palette },
    ],
  },
  {
    key: 'reach',
    labelKey: 'nav.reach',
    items: [
      {
        key: 'qr',
        path: '/qr',
        labelKey: 'nav.qr',
        icon: QrCode,
        // Always open: the plain code is every restaurant's. The studio's
        // styling is what the package and the Features switch decide.
        requiresTemplate: true,
      },
      {
        key: 'social-links',
        path: '/social-links',
        labelKey: 'nav.socialLinks',
        icon: Share2,
      },
    ],
  },
  {
    key: 'account',
    labelKey: 'nav.account',
    items: [
      { key: 'package', path: '/package', labelKey: 'nav.package', icon: Crown },
      {
        key: 'settings',
        path: '/settings',
        labelKey: 'nav.restaurant',
        icon: Store,
        requiresTemplate: true,
      },
      { key: 'features', path: '/features', labelKey: 'nav.features', icon: ToggleRight },
      { key: 'account', path: '/account', labelKey: 'nav.profile', icon: UserRound },
    ],
  },
]

/** Every item, flattened, for lookups by key. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items)

/** The sections an owner can switch off, in sidebar order. */
export const HIDEABLE_ITEMS: NavItem[] = NAV_ITEMS.filter((item) => item.hideable)

/** Whether the owner switched this section off. Only hideable sections can be. */
export function isNavItemHidden(key: string, hidden: readonly string[]): boolean {
  return hidden.includes(key) && HIDEABLE_ITEMS.some((item) => item.key === key)
}

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
