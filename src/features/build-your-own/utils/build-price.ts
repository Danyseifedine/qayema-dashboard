/**
 * What a "build your own" adds to its dish, the twin of
 * ../qayema/app/Services/Menu/BuildPrice.php (and the menu's buildPrice()),
 * tested against the same cases: change one, change all. Worked in whole
 * cents so the three come to the same cent.
 *
 * - `split`, one item in N parts: a part pays the price its choice sets for
 *   that size (its `part_prices`, a half at $7), else its share of the
 *   whole. The shares are added up first and rounded once, half up, so half
 *   of $12 and half of $16 is $14, never a cent off.
 * - `pieces`, N whole items: each part is its choice's whole price.
 *
 * `cheapestCents` is BuildPrice::cheapest(), the least a guest pays.
 */

export type BuildShape = 'split' | 'pieces'

/**
 * A choice's own price for one part, by part count: saved as `{"2":
 * "7.00"}`, held by the form as a list whose index is the count. Either
 * reads the same by `[count]`.
 */
export type PartPrices = Readonly<Record<string, unknown>> | readonly unknown[] | null | undefined

/** One part's choice: its whole price ("12.00" saved, 12 in the form). */
export type BuildPart = { price: string | number; part_prices?: PartPrices }

function isNumeric(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value)
  return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))
}

function cents(price: string | number): number {
  return Math.round(Number(price) * 100)
}

/**
 * The price a choice sets for one part of `count`, in cents, null for its
 * share. Only a part has a size: a whole (1) is the choice's own price.
 */
export function partPriceCents(partPrices: PartPrices, count: number): number | null {
  const price = (partPrices as Readonly<Record<string, unknown>> | null | undefined)?.[
    String(count)
  ]
  return count > 1 && isNumeric(price) ? cents(price as string | number) : null
}

/** One part's share of a whole price, rounded half up: $12.25 in two is $6.13. */
export function shareCents(price: string | number, count: number): number {
  return Math.floor((2 * cents(price) + count) / (2 * count))
}

/** What the build adds to its dish, in cents, for these parts' choices. */
export function buildPriceCents(shape: BuildShape, parts: readonly BuildPart[]): number {
  const count = parts.length
  if (count === 0) return 0

  if (shape === 'pieces') return parts.reduce((sum, part) => sum + cents(part.price), 0)

  let shares = 0
  let set = 0
  for (const part of parts) {
    const own = partPriceCents(part.part_prices, count)
    if (own === null) shares += cents(part.price)
    else set += own
  }

  // Half up, once over the whole: the server's intdiv(2s + n, 2n).
  return Math.floor((2 * shares + count) / (2 * count)) + set
}

/**
 * The least the build adds: its cheapest choice in every part, at whichever
 * allowed count comes cheapest. The twin of BuildPrice::cheapest(), what the
 * menu's dish card counts its "from" price with; 0 without a count or a choice.
 */
export function cheapestCents(
  shape: BuildShape,
  counts: readonly number[],
  choices: readonly BuildPart[],
): number {
  let lowest: number | null = null
  for (const count of counts) {
    for (const choice of choices) {
      const price = buildPriceCents(
        shape,
        Array.from({ length: count }, () => choice),
      )
      lowest = lowest === null || price < lowest ? price : lowest
    }
  }
  return lowest ?? 0
}
