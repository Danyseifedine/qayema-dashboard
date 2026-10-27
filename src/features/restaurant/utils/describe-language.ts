import { MENU_LANGUAGES, languageName } from '@/shared/constants/menu-languages'

/** "French · Français"; one name when both are the same word. */
export function describeLanguage(code: string): string {
  const name = languageName(code)
  const native = MENU_LANGUAGES[code]?.name
  return !native || native === name ? name : `${name} · ${native}`
}
