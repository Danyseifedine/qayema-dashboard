import type { MenuTextForm } from '@/shared/utils/string/menu-text'
import {
  missingTranslation,
  type MissingTranslation,
} from '@/shared/utils/string/missing-translations'
import { MENU_TEXT_LIMITS } from '@/shared/constants/menu-text-limits'

type ChoiceTexts = {
  variants: { name: MenuTextForm; options: { name: MenuTextForm }[] }[]
  addons: { name: MenuTextForm }[]
}

type DishTexts = ChoiceTexts & { name: MenuTextForm; ingredients: MenuTextForm }

/** Every variant, option and add-on name written in one language only. */
export function missingChoiceTranslations(
  values: ChoiceTexts,
  languages: readonly string[],
): MissingTranslation[] {
  const max = MENU_TEXT_LIMITS.choiceName
  return [
    ...values.variants.flatMap((variant, v) => [
      ...missingTranslation(variant.name, `variants.${v}.name`, languages, max),
      ...variant.options.flatMap((option, o) =>
        missingTranslation(option.name, `variants.${v}.options.${o}.name`, languages, max),
      ),
    ]),
    ...values.addons.flatMap((addon, a) =>
      missingTranslation(addon.name, `addons.${a}.name`, languages, max),
    ),
  ]
}

/** Everything on a dish written in one language only: its name, ingredients and choices. */
export function missingDishTranslations(
  values: DishTexts,
  languages: readonly string[],
): MissingTranslation[] {
  return [
    ...missingTranslation(values.name, 'name', languages, MENU_TEXT_LIMITS.dishName),
    ...missingTranslation(
      values.ingredients,
      'ingredients',
      languages,
      MENU_TEXT_LIMITS.ingredients,
    ),
    ...missingChoiceTranslations(values, languages),
  ]
}
