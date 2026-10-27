import type { TranslationPiece } from '@/shared/hooks/use-writing-help'
import type { MenuTextForm } from '@/shared/utils/string/menu-text'

/** A piece to translate, and the form path its translation goes to (`name.ar`). */
export type MissingTranslation = TranslationPiece & { path: string }

/**
 * A text written in one of the menu's two languages only: from it, into the
 * other, held to the field's `max`. Nothing on a menu in one language, or
 * when both or neither have text.
 */
export function missingTranslation(
  text: MenuTextForm,
  path: string,
  languages: readonly string[],
  max: number,
): MissingTranslation[] {
  const [first = '', second] = languages
  if (second === undefined) return []
  const one = (text[first] ?? '').trim()
  const other = (text[second] ?? '').trim()
  if (one !== '' && other === '')
    return [{ path: `${path}.${second}`, text: one, from: first, to: second, max }]
  if (other !== '' && one === '')
    return [{ path: `${path}.${first}`, text: other, from: second, to: first, max }]
  return []
}

/** The pieces as the writing help takes them, without the form paths. */
export function piecesOf(missing: MissingTranslation[]): TranslationPiece[] {
  return missing.map(({ path: _path, ...piece }) => piece)
}

/**
 * `values` with each translation at its piece's path. What it touches is
 * copied, so the values handed in stay as they were; an answer short of
 * one leaves that text as it was.
 */
export function withTranslations<T extends object>(
  values: T,
  missing: MissingTranslation[],
  texts: string[],
): T {
  const roots = [...new Set(missing.map((piece) => piece.path.split('.')[0]!))]
  const copy = structuredClone(
    Object.fromEntries(roots.map((root) => [root, (values as Record<string, unknown>)[root]])),
  )
  missing.forEach((piece, index) => {
    const text = texts[index]
    if (text === undefined) return
    const keys = piece.path.split('.')
    const last = keys.pop()!
    const parent = keys.reduce<Record<string, unknown>>(
      (node, key) => node[key] as Record<string, unknown>,
      copy,
    )
    parent[last] = text
  })
  return { ...values, ...copy }
}
