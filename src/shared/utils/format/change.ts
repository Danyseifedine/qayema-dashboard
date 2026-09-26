/**
 * The change from one count to another, as a fraction, for `StatTile`.
 * Growing from nothing has no percentage, so that is null.
 */
export function changeBetween(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return (current - previous) / previous
}
