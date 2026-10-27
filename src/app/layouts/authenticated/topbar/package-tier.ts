/** The metal the topbar's package badge is drawn in. */
export type PackageTier = 'bronze' | 'silver' | 'gold'

/**
 * The metal the admin gave the package (`tier`). A server from before it
 * sends none: then Free is bronze, Pro silver, Premium and Custom gold, and
 * anything else reads as Free.
 */
export function tierOf({
  slug,
  tier,
}: {
  slug: string | null
  tier: PackageTier | null
}): PackageTier {
  if (tier) return tier
  if (slug === 'pro') return 'silver'
  if (slug === 'premium' || slug === 'custom') return 'gold'
  return 'bronze'
}
