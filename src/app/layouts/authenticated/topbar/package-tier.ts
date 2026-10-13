/** The metal the topbar's package badge is drawn in. */
export type PackageTier = 'bronze' | 'silver' | 'gold'

/** Free is bronze, Pro silver, Premium and Custom gold; anything else reads as Free. */
export function tierOf(slug: string | null): PackageTier {
  if (slug === 'pro') return 'silver'
  if (slug === 'premium' || slug === 'custom') return 'gold'
  return 'bronze'
}
