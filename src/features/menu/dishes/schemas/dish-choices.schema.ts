import { z } from 'zod'
import { t } from '@/lib/i18n'
import {
  menuTextField,
  menuTextSchema,
  requireMainLanguage,
  toMenuTextForm,
  type MenuText,
  type MenuTextForm,
} from '@/shared/utils/string/menu-text'

/**
 * A dish's variants (Size, Spice level: the guest picks one option of each)
 * and add-ons (Extra cheese: any number), each adding its price to the
 * dish's. Mirrors the `variants` and `addons` of
 * ../qayema/app/Http/Resources/DishResource.php; prices come back as decimal
 * strings ("1.50").
 */
const choiceSchema = z.object({
  id: z.number().int(),
  name: menuTextSchema,
  price: z.string(),
})

export const variantSchema = z.object({
  id: z.number().int(),
  name: menuTextSchema,
  options: z.array(choiceSchema),
})

export const addonsSchema = z.array(choiceSchema)

export type Choice = z.infer<typeof choiceSchema>
export type Variant = z.infer<typeof variantSchema>

/** What one dish can carry, as ../qayema/config/menu.php has it. */
export const CHOICE_LIMITS = {
  variants: 5,
  options: 10,
  addons: 20,
  name: 60,
  // As a dish's own price: a menu in Lebanese pounds runs to millions.
  price: 99_999_999.99,
} as const

const choiceRow = z.object({
  /** The saved row's id, so an edit keeps it; null for a new one. Not `id`,
   *  which react-hook-form's field arrays use for their own keys. */
  savedId: z.number().int().nullable(),
  name: menuTextField(CHOICE_LIMITS.name, () => t('menu:fields.name')),
  // Empty means "costs nothing more".
  price: z
    .number({ error: () => t('menu:dishSchema.priceInvalid') })
    .min(0, { error: () => t('menu:dishSchema.priceNegative') })
    .max(CHOICE_LIMITS.price, { error: () => t('menu:dishSchema.priceTooHigh') })
    .nullable(),
})

export const variantsField = z
  .array(
    z.object({
      savedId: z.number().int().nullable(),
      name: menuTextField(CHOICE_LIMITS.name, () => t('menu:fields.name')),
      options: z
        .array(choiceRow)
        .min(2, { error: () => t('menu:choices.needTwo') })
        .max(CHOICE_LIMITS.options),
    }),
  )
  .max(CHOICE_LIMITS.variants)

export const addonsField = z.array(choiceRow).max(CHOICE_LIMITS.addons)

export type ChoiceRowForm = z.input<typeof choiceRow>
export type VariantForm = z.input<typeof variantsField>[number]

type ChoicesForm = { variants: VariantForm[]; addons: ChoiceRowForm[] }

/**
 * The menu's main language is the one every variant, option and add-on
 * needs, as with the dish's own name. Added to the dish form's refinement.
 */
export function requireChoiceNames(values: ChoicesForm, ctx: z.RefinementCtx): void {
  values.variants.forEach((variant, v) => {
    requireMainLanguage(
      variant.name,
      `variants.${v}.name`,
      (language) => t('menu:choices.variantNameRequired', { language }),
      ctx,
    )
    variant.options.forEach((option, o) =>
      requireMainLanguage(
        option.name,
        `variants.${v}.options.${o}.name`,
        (language) => t('menu:choices.optionNameRequired', { language }),
        ctx,
      ),
    )
  })
  values.addons.forEach((addon, a) =>
    requireMainLanguage(
      addon.name,
      `addons.${a}.name`,
      (language) => t('menu:choices.addonNameRequired', { language }),
      ctx,
    ),
  )
}

function toRow(choice: Choice, languages: readonly string[], keepId: boolean): ChoiceRowForm {
  return {
    savedId: keepId ? choice.id : null,
    name: toMenuTextForm(choice.name, languages),
    // Nothing more to pay shows as an empty price, which the form calls free.
    price: Number(choice.price) === 0 ? null : Number(choice.price),
  }
}

/**
 * The form's lists for a dish. `keepIds` is false when copying another
 * dish's, so saving makes this dish its own rows.
 */
export function toChoicesForm(
  dish: { variants: Variant[]; addons: Choice[] } | null,
  languages: readonly string[],
  keepIds = true,
): ChoicesForm {
  return {
    variants: (dish?.variants ?? []).map((variant) => ({
      savedId: keepIds ? variant.id : null,
      name: toMenuTextForm(variant.name, languages),
      options: variant.options.map((option) => toRow(option, languages, keepIds)),
    })),
    addons: (dish?.addons ?? []).map((addon) => toRow(addon, languages, keepIds)),
  }
}

export type ChoicePayload = { id?: number; name: MenuTextForm; price: number }
export type VariantPayload = { id?: number; name: MenuTextForm; options: ChoicePayload[] }

function toChoicePayload(row: ChoiceRowForm): ChoicePayload {
  return {
    ...(row.savedId === null ? {} : { id: row.savedId }),
    name: row.name,
    price: row.price ?? 0,
  }
}

export function toVariantsPayload(variants: VariantForm[]): VariantPayload[] {
  return variants.map((variant) => ({
    ...(variant.savedId === null ? {} : { id: variant.savedId }),
    name: variant.name,
    options: variant.options.map(toChoicePayload),
  }))
}

export function toAddonsPayload(addons: ChoiceRowForm[]): ChoicePayload[] {
  return addons.map(toChoicePayload)
}

/**
 * The least and most a guest can pay for one of the dish: the cheapest
 * option of each variant, then the dearest of each with every add-on.
 */
export function priceRange(
  base: number,
  variants: VariantForm[],
  addons: ChoiceRowForm[],
): { min: number; max: number } {
  let min = base
  let max = base
  for (const variant of variants) {
    const prices = variant.options.map((option) => option.price ?? 0)
    if (prices.length === 0) continue
    min += Math.min(...prices)
    max += Math.max(...prices)
  }
  for (const addon of addons) max += addon.price ?? 0
  return { min, max }
}

/** Whether a saved dish has anything to copy. */
export function hasChoices(dish: { variants: Variant[]; addons: Choice[] }): boolean {
  return dish.variants.length > 0 || dish.addons.length > 0
}

/**
 * Ready-made variants an owner can start from. They are menu text, not
 * interface text, so each carries its own names; a menu language without
 * one is left blank, and the menu shows the English.
 */
export const VARIANT_PRESETS: {
  key: 'size' | 'spice' | 'quantity'
  name: MenuText
  options: MenuText[]
}[] = [
  {
    key: 'size',
    name: { en: 'Size', ar: 'الحجم' },
    options: [
      { en: 'Small', ar: 'صغير' },
      { en: 'Medium', ar: 'وسط' },
      { en: 'Large', ar: 'كبير' },
    ],
  },
  {
    key: 'spice',
    name: { en: 'Spice level', ar: 'مستوى البهارات' },
    options: [
      { en: 'Mild', ar: 'خفيف' },
      { en: 'Medium', ar: 'وسط' },
      { en: 'Hot', ar: 'حار' },
    ],
  },
  {
    key: 'quantity',
    name: { en: 'Quantity', ar: 'الكمية' },
    options: [
      { en: '6 pieces', ar: '6 قطع' },
      { en: '12 pieces', ar: '12 قطعة' },
    ],
  },
]

/** A preset as a new variant of the form. */
export function presetVariant(
  preset: (typeof VARIANT_PRESETS)[number],
  languages: readonly string[],
): VariantForm {
  return {
    savedId: null,
    name: toMenuTextForm(preset.name, languages),
    options: preset.options.map((name) => ({
      savedId: null,
      name: toMenuTextForm(name, languages),
      price: null,
    })),
  }
}

/** A blank row for the owner to fill. */
export function blankChoice(languages: readonly string[]): ChoiceRowForm {
  return { savedId: null, name: toMenuTextForm(null, languages), price: null }
}

export function blankVariant(languages: readonly string[]): VariantForm {
  return {
    savedId: null,
    name: toMenuTextForm(null, languages),
    options: [blankChoice(languages), blankChoice(languages)],
  }
}
