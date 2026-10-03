import type { Package, PackageFlag, PackageLimit } from '@/features/package/schemas/package.schema'

export type PackageGroup = 'menu' | 'look' | 'guests' | 'numbers'

export type PackageRow =
  | { kind: 'limit'; key: PackageLimit; group: PackageGroup }
  | { kind: 'flag'; key: PackageFlag; group: PackageGroup }

/**
 * Every feature a package can carry, in the order and groups the owner reads
 * them. The cards and the comparison table are both built from this list, so
 * they can never disagree. A feature the API sends that is not here is not
 * shown.
 */
export const PACKAGE_ROWS: readonly PackageRow[] = [
  { kind: 'limit', key: 'dish_limit', group: 'menu' },
  { kind: 'limit', key: 'category_limit', group: 'menu' },
  { kind: 'limit', key: 'social_link_limit', group: 'menu' },
  { kind: 'flag', key: 'multiple_languages', group: 'menu' },
  { kind: 'flag', key: 'variants', group: 'menu' },
  { kind: 'flag', key: 'addons', group: 'menu' },
  { kind: 'flag', key: 'appearance', group: 'look' },
  { kind: 'flag', key: 'premium_designs', group: 'look' },
  { kind: 'flag', key: 'qr_studio', group: 'guests' },
  { kind: 'flag', key: 'ordering', group: 'guests' },
  { kind: 'flag', key: 'menu_ordering', group: 'guests' },
  { kind: 'flag', key: 'analytics', group: 'numbers' },
  { kind: 'flag', key: 'advanced_analytics', group: 'numbers' },
]

export const PACKAGE_GROUPS: readonly PackageGroup[] = ['menu', 'look', 'guests', 'numbers']

/** Null is unlimited, so it beats any number. */
function atLeast(value: number | null, than: number | null): boolean {
  if (value === null) return true
  if (than === null) return false
  return value >= than
}

/**
 * What a card lists. When a package has everything the one before it has,
 * the card says "Everything in {base}, plus" and lists only what grows or is
 * new; otherwise it lists all it includes, so the claim is never false.
 */
export function highlightsOf(
  pkg: Package,
  previous: Package | undefined,
): { base: Package | null; rows: PackageRow[] } {
  const included = PACKAGE_ROWS.filter((row) => row.kind === 'limit' || pkg.features[row.key])

  const covers =
    previous !== undefined &&
    PACKAGE_ROWS.every((row) =>
      row.kind === 'limit'
        ? atLeast(pkg.features[row.key], previous.features[row.key])
        : pkg.features[row.key] || !previous.features[row.key],
    )

  if (!covers) return { base: null, rows: included }

  return {
    base: previous,
    rows: included.filter((row) =>
      row.kind === 'limit'
        ? pkg.features[row.key] !== previous.features[row.key]
        : !previous.features[row.key],
    ),
  }
}
