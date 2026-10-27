import { MENU_TEXT_LIMITS } from '@/shared/constants/menu-text-limits'
import type { MenuTextForm } from '@/shared/utils/string/menu-text'
import {
  missingTranslation,
  type MissingTranslation,
} from '@/shared/utils/string/missing-translations'

type BuildTexts = {
  source: 'category' | 'own'
  choices: { name: MenuTextForm }[]
  dish: { name: MenuTextForm }
}

/**
 * Everything the editor saves written in one language only: the dish's
 * name (also the title above the parts) and the own list's names (a
 * category's build is named by its dishes, and a list kept for a switch
 * back is not sent).
 */
export function missingBuildTranslations(
  values: BuildTexts,
  languages: readonly string[],
): MissingTranslation[] {
  const max = MENU_TEXT_LIMITS.choiceName
  return [
    ...missingTranslation(values.dish.name, 'dish.name', languages, MENU_TEXT_LIMITS.dishName),
    ...(values.source === 'own'
      ? values.choices.flatMap((choice, index) =>
          missingTranslation(choice.name, `choices.${index}.name`, languages, max),
        )
      : []),
  ]
}
