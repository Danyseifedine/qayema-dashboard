/**
 * A dish's ingredients as a tidy list, however they were typed: commas,
 * Arabic commas, dots, new lines or "etc." all come out as one clean list,
 * written back with the separator of the language ("، " in Arabic).
 *
 * The twin of the backend's `App\Support\Ingredients`, which tidies every
 * save: change one, change both. Here it tidies the box as the owner leaves
 * it, so what they see is what the menu shows.
 */

/** More would not read as a list under a dish. */
export const MAX_INGREDIENTS = 40

/** What owners add at the end of a list that is no ingredient. */
const NOT_INGREDIENTS = new Set(['etc', 'ect', 'etc.', 'and more', 'إلخ', 'الخ', 'وغيرها', 'وغيره'])

/** Languages that list with a separator of their own. */
const SEPARATORS: Record<string, string> = { ar: '، ', zh: '、' }

/** The items, in the order typed, each once. */
export function splitIngredients(text: string | null | undefined): string[] {
  if (!text || text.trim() === '') return []

  // A run of dots, an ellipsis, or a dot that ends a phrase separates items;
  // a dot inside a number (1.5) does not.
  const parts = text
    .replace(/\.{2,}|…/g, ',')
    .replace(/\.(?=\s|$)/g, ',')
    .split(/[,،、;؛\r\n•·|]+/)

  const items: string[] = []
  const seen = new Set<string>()
  for (const part of parts) {
    const item = part.replace(/\s+/g, ' ').replace(/^[\s\-*.:]+|[\s\-*.:]+$/g, '')
    const key = item.toLowerCase()
    if (item === '' || NOT_INGREDIENTS.has(key) || seen.has(key)) continue
    seen.add(key)
    items.push(item)
  }

  return items.slice(0, MAX_INGREDIENTS)
}

/** The text as a clean list in this language; empty when nothing in it is an ingredient. */
export function tidyIngredients(text: string | null | undefined, language: string): string {
  return splitIngredients(text).join(SEPARATORS[language] ?? ', ')
}
