/** A dish as the picker groups it. */
type Groupable = { built: boolean; categoryId: number | null }

/** One heading of the dish picker and the dishes under it. */
export type DishGroup<D> =
  | { kind: 'built'; dishes: D[] }
  | { kind: 'category'; id: number; dishes: D[] }
  | { kind: 'other'; dishes: D[] }

/**
 * The dish picker's groups: the dishes guests build first (they sit in no
 * category, above the menu's search), then each category in the menu's
 * order, then any dish in none of them (or every dish while the categories
 * load). Empty groups are left out, so a search shows only what matches.
 */
export function dishGroups<D extends Groupable>(
  dishes: readonly D[],
  categoryIds: readonly number[],
): DishGroup<D>[] {
  const built = dishes.filter((dish) => dish.built)
  const rest = dishes.filter((dish) => !dish.built)
  const known = new Set(categoryIds)
  const groups: DishGroup<D>[] = []
  if (built.length > 0) groups.push({ kind: 'built', dishes: built })
  for (const id of categoryIds) {
    const inIt = rest.filter((dish) => dish.categoryId === id)
    if (inIt.length > 0) groups.push({ kind: 'category', id, dishes: inIt })
  }
  const other = rest.filter((dish) => dish.categoryId === null || !known.has(dish.categoryId))
  if (other.length > 0) groups.push({ kind: 'other', dishes: other })
  return groups
}
