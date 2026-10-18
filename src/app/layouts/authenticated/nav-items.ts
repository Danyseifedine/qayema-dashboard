import {
  IconChartHistogram,
  IconCrown,
  IconLayoutDashboard,
  IconLayoutList,
  type TablerIcon,
  IconPalette,
  IconQrcode,
  IconReceipt,
  IconBuildingStore,
  IconColorSwatch,
  IconShare,
  IconToggleRight,
  IconUserCircle,
  IconToolsKitchen2,
  IconArmchair,
  IconBowlSpoon,
  IconLayoutGrid,
  IconHome,
} from '@tabler/icons-react'
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
  icon: TablerIcon
  /** Locked until the owner has picked a design. */
  requiresTemplate?: boolean
  /** Locked unless the restaurant's plan includes the flag. */
  requiresPlan?: PlanFlag
  /**
   * Leaves the sidebar when the owner switches its feature off on the
   * Features page (same key in `Restaurant::OPTIONAL_FEATURES`, ../qayema).
   */
  hideable?: true
  /**
   * The Features switch that hides it, when that is not its own key: two
   * pages can belong to one feature (Tables and Table orders, `dine_in`).
   */
  switchKey?: string
}

export type NavGroup = {
  key: string
  /** Omitted for the first group, which needs no heading. */
  labelKey?: NavLabelKey
  items: NavItem[]
}

/**
 * The sidebar, ordered by how often the owner opens each page: the numbers
 * and the orders they work through all day first, then building the menu
 * and its look, then what is printed or shared once (the QR code, the
 * tables' codes, social links), then the restaurant's settings. Keys are
 * the feature folders under `src/features/` (Table orders is a page of
 * `orders`). Anything that works on the menu itself only unlocks once a
 * design is chosen (`requiresTemplate`).
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'main',
    items: [
      { key: 'overview', labelKey: 'nav.overview', icon: IconLayoutDashboard },
      {
        key: 'analytics',
        labelKey: 'nav.analytics',
        icon: IconChartHistogram,
        requiresPlan: 'analytics',
        hideable: true,
      },
    ],
  },
  {
    key: 'orders',
    labelKey: 'nav.ordersGroup',
    items: [
      {
        key: 'orders',
        labelKey: 'nav.orders',
        icon: IconReceipt,
        requiresTemplate: true,
        requiresPlan: 'ordering',
        hideable: true,
      },
      // Ordering at the table: a feature of its own, apart from Orders.
      {
        key: 'table-orders',
        labelKey: 'nav.tableOrders',
        icon: IconToolsKitchen2,
        requiresTemplate: true,
        requiresPlan: 'dine_in',
        hideable: true,
        switchKey: 'dine_in',
      },
    ],
  },
  {
    key: 'menu',
    labelKey: 'nav.menu',
    items: [
      {
        key: 'categories',
        labelKey: 'nav.categories',
        icon: IconLayoutList,
        requiresTemplate: true,
      },
      { key: 'dishes', labelKey: 'nav.dishes', icon: IconBowlSpoon, requiresTemplate: true },
    ],
  },
  {
    key: 'look',
    labelKey: 'nav.look',
    items: [
      // Always open: it is how an owner gets out of the locked state.
      { key: 'design', labelKey: 'nav.design', icon: IconPalette },
      // Its settings are the design's, so it waits for one to be chosen.
      {
        key: 'appearance',
        labelKey: 'nav.appearance',
        icon: IconColorSwatch,
        requiresTemplate: true,
        requiresPlan: 'appearance',
      },
    ],
  },
  {
    key: 'sharing',
    labelKey: 'nav.sharing',
    items: [
      // Always open: the plain code is every restaurant's. The studio's
      // styling is what the plan and the Features switch decide.
      { key: 'qr', labelKey: 'nav.qr', icon: IconQrcode, requiresTemplate: true },
      // A QR code per table, printed beside the menu's own.
      {
        key: 'tables',
        labelKey: 'nav.tables',
        icon: IconArmchair,
        requiresTemplate: true,
        requiresPlan: 'dine_in',
        hideable: true,
        switchKey: 'dine_in',
      },
      { key: 'social-links', labelKey: 'nav.socialLinks', icon: IconShare },
    ],
  },
  {
    key: 'settings',
    labelKey: 'nav.settings',
    items: [
      {
        key: 'restaurant',
        labelKey: 'nav.restaurant',
        icon: IconBuildingStore,
        requiresTemplate: true,
      },
      { key: 'features', labelKey: 'nav.features', icon: IconToggleRight },
      { key: 'package', labelKey: 'nav.package', icon: IconCrown },
    ],
  },
]

/**
 * The owner's own account is a page too, but it is about the person, not the
 * restaurant, so it opens from the avatar menu rather than the sidebar.
 */
const ACCOUNT_ITEM: NavItem = { key: 'account', labelKey: 'nav.account', icon: IconUserCircle }

/**
 * On a phone the sidebar is four tabs at the bottom (`phoneTabs`); every
 * section that is not a tab is a tile on this page, the last tab.
 */
const MORE_ITEM: NavItem = { key: 'more', labelKey: 'nav.more', icon: IconLayoutGrid }

/** Every page, flattened, for lookups by key. */
export const NAV_ITEMS: NavItem[] = [
  ...NAV_GROUPS.flatMap((group) => group.items),
  ACCOUNT_ITEM,
  MORE_ITEM,
]

/** The sections an owner can switch off, in sidebar order. */
const HIDEABLE_ITEMS: NavItem[] = NAV_ITEMS.filter((item) => item.hideable)

/** Whether the owner switched this section off. Only hideable sections can be. */
export function isNavItemHidden(key: string, off: readonly string[]): boolean {
  const item = HIDEABLE_ITEMS.find((candidate) => candidate.key === key)
  return item !== undefined && off.includes(item.switchKey ?? item.key)
}

/** Whether the package includes this section. A section without a flag always is. */
export function isOnPlan(item: NavItem, plan: Plan): boolean {
  return item.requiresPlan === undefined || plan[item.requiresPlan]
}

export type NavAccess = {
  hasTemplate: boolean
  plan: Plan
}

/**
 * Why a section is closed to this owner, or null when it is open.
 *
 * `template`: nothing to work on until a design is chosen, so the row is
 * disabled. `plan`: the package does not include it, so the sidebar leaves it
 * out (`isOnPlan`); opened by a link, the page shows what it would give and
 * which package has it.
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

/** The pages an owner can still open while the menu is offline (an ended package past its grace days). */
export const OPEN_WHILE_OFFLINE: readonly string[] = ['package', 'account']

/** A tab in the phone's bottom bar: the page it opens and the pages it stands for. */
export type PhoneTab = {
  key: string
  labelKey: NavLabelKey
  icon: TablerIcon
  /** The pages that light this tab up (Menu: its categories and dishes). */
  covers: readonly string[]
}

/**
 * The four tabs at the bottom of a phone: Home, Menu, the orders (or, for a
 * restaurant that takes none, its analytics, else its QR code), and More,
 * which holds every other section. A tab only names a section this owner
 * has: one the package lacks or the owner switched off gives its place to
 * the next.
 */
export function phoneTabs(access: NavAccess, off: readonly string[]): PhoneTab[] {
  const shown = (key: string) => {
    const item = NAV_ITEMS.find((candidate) => candidate.key === key)!
    return !isNavItemHidden(key, off) && isOnPlan(item, access.plan)
  }
  const third = ['orders', 'table-orders', 'analytics'].find(shown) ?? 'qr'
  const thirdItem = NAV_ITEMS.find((item) => item.key === third)!
  const ordersCover = ['orders', 'table-orders'].filter(shown)

  return [
    { key: 'overview', labelKey: 'nav.home', icon: IconHome, covers: ['overview'] },
    { key: 'dishes', labelKey: 'nav.menu', icon: IconBowlSpoon, covers: ['dishes', 'categories'] },
    {
      key: third,
      labelKey: thirdItem.labelKey,
      icon: thirdItem.icon,
      covers: third === 'orders' || third === 'table-orders' ? ordersCover : [third],
    },
    { key: 'more', labelKey: 'nav.more', icon: IconLayoutGrid, covers: ['more'] },
  ]
}

/** The tab a page belongs to on a phone: its own, or More for every other section. */
export function phoneTabOf(key: string, tabs: readonly PhoneTab[]): string {
  return tabs.find((tab) => tab.covers.includes(key))?.key ?? 'more'
}
