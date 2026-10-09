import { z } from 'zod'
import { t } from '@/lib/i18n'
import { languageName } from '@/shared/constants/menu-languages'

/**
 * A piece of menu text as the API sends it: one entry per language the menu
 * is written in (the main one, then the second), null when not written.
 */
export const menuTextSchema = z.record(z.string(), z.string().nullable())

export type MenuText = z.infer<typeof menuTextSchema>

/**
 * An `{en, ar}` pair, as the platform's own content (packages, designs)
 * comes. A restaurant's menu text uses `menuTextSchema` instead, keyed by the
 * restaurant's own languages.
 */
export const translatableTextSchema = z.object({
  en: z.string().nullable(),
  ar: z.string().nullable(),
})

/** The same text as a form holds it: a string per language, '' when empty. */
export type MenuTextForm = Record<string, string>

/**
 * A form field for menu text, each language capped at `max` characters.
 *
 * `what` names the field inside the message. Schemas are built at module
 * load, so pass a function (`() => t('…')`) for a name in the reader's
 * language; a plain string is shown as given.
 */
export function menuTextField(max: number, what: string | (() => string)) {
  return z.record(
    z.string(),
    z
      .string()
      .trim()
      .max(max, {
        error: () =>
          t('menuText.tooLong', { what: typeof what === 'function' ? what() : what, max }),
      }),
  )
}

/**
 * Form values for a piece of menu text: an entry for every language the menu
 * is written in, filled from what was saved.
 */
export function toMenuTextForm(
  value: MenuText | null | undefined,
  languages: readonly string[],
): MenuTextForm {
  return Object.fromEntries(languages.map((code) => [code, value?.[code] ?? '']))
}

/**
 * Adds "required in <the main language>" to a form schema's refinement: the
 * menu's main language is the one every name must have. It is the form
 * text's first entry, as `toMenuTextForm()` orders it by the menu's
 * languages. `message` gets that language's name ("French").
 */
export function requireMainLanguage(
  text: MenuTextForm,
  path: string,
  message: (language: string) => string,
  ctx: z.RefinementCtx,
): void {
  const main = Object.keys(text)[0]
  if (main !== undefined && (text[main] ?? '').trim() === '') {
    ctx.addIssue({ code: 'custom', path: [path, main], message: message(languageName(main)) })
  }
}
