import { z } from 'zod'
import { MENU_TEXT_LIMITS } from '@/shared/constants/menu-text-limits'
import { imageFieldSchema } from '@/features/uploads'
import { t } from '@/lib/i18n'
import { menuTextField, menuTextSchema, requireMainLanguage } from '@/shared/utils/string/menu-text'
import {
  addonsField,
  addonsSchema,
  requireChoiceNames,
  variantSchema,
  variantsField,
} from '@/features/menu/dishes/schemas/dish-choices.schema'

/**
 * A dish's "build your own" (a pizza half and half, three scoops), as
 * DishResource sends `builds`; the Build your own page edits them. A
 * category's build lists only the dishes the owner gave part prices.
 * Prices come back as decimal strings ("7.00").
 */
const buildChoiceSchema = z.object({
  id: z.number().int(),
  /** Set for a category's dish; its name and price are the dish's. */
  dish_id: z.number().int().nullable(),
  name: menuTextSchema.nullable(),
  price: z.string().nullable(),
  /** Its own price for one part, by part count: `{"2": "7.00"}`. */
  part_prices: z.record(z.string(), z.string()).default({}),
})

const buildSchema = z.object({
  id: z.number().int(),
  name: menuTextSchema,
  shape: z.enum(['split', 'pieces']),
  /** The part counts a guest may pick, smallest first. */
  parts: z.array(z.number().int()),
  category_id: z.number().int().nullable(),
  /** Only these of the category's dishes; null for every one (or from a server from before). */
  dish_ids: z.array(z.number().int()).nullable().default(null),
  choices: z.array(buildChoiceSchema),
})

/**
 * The offer a deal dish was made by (DishResource `offer`): the dish is on
 * the menu only while it is live. `status` and `next_start` are the
 * offer's own, as OfferResource sends them.
 */
const dishOfferSchema = z.object({
  id: z.number().int(),
  title: menuTextSchema,
  /** `off`: switched on, but the package keeps the offer (and its deal) off the menu. */
  status: z.enum(['live', 'scheduled', 'ended', 'paused', 'off']),
  /** When it next turns live, the restaurant's local "2026-11-13T18:00"; null for never. */
  next_start: z.string().nullable(),
})

export type DishOffer = z.infer<typeof dishOfferSchema>

/**
 * Mirrors ../qayema/app/Http/Resources/DishResource.php.
 *
 * `price` comes back as a decimal STRING ("24.50") or null, because the column
 * is decimal(10,2) and the resource casts it. Requests send a number.
 */
const dishSchema = z.object({
  id: z.number().int(),
  /** One entry per menu language. */
  name: menuTextSchema,
  ingredients: menuTextSchema,
  price: z.string().nullable(),
  is_available: z.boolean(),
  // Null once its category has been deleted; the dish survives, orphaned.
  category_id: z.number().int().nullable(),
  image_url: z.url().nullable(),
  /** Sent whether or not the owner has them switched on. */
  variants: z.array(variantSchema),
  addons: addonsSchema,
  /** Its "build your own"; none from a server from before them. */
  builds: z.array(buildSchema).default([]),
  /** A build's dish's icon (the categories' set), drawn above the menu's search; null for none. */
  icon: z.string().nullable().default(null),
  /** The offer that made it, for a deal dish; null otherwise or from a server from before them. */
  offer: dishOfferSchema.nullable().default(null),
  /**
   * What the dish, its variants and its add-ons are priced in: the main
   * currency or the restaurant's second one.
   */
  currency: z.string().optional(),
})

/** A dish as one answer sends it, its currency left out by a server from before. */
export type ApiDish = z.infer<typeof dishSchema>

/** A dish with its currency always known. */
export type Dish = Omit<ApiDish, 'currency'> & { currency: string }

/** The dish with its own currency, the main one when the answer does not say. */
export function withCurrency(dish: ApiDish, main: string): Dish {
  return { ...dish, currency: dish.currency ?? main }
}

export const dishListSchema = z
  .object({
    data: z.array(dishSchema),
    meta: z.object({
      used: z.number().int(),
      /** Null means unlimited on this package. */
      limit: z.number().int().nullable(),
      currency: z.string(),
      /** The one other currency a dish may be priced in; null for none. */
      second_currency: z.string().nullable().default(null),
      /** Main per one second, as a decimal string ("89000"); null without one. */
      exchange_rate: z.string().nullable().default(null),
    }),
  })
  .transform((list) => ({
    ...list,
    data: list.data.map((dish) => withCurrency(dish, list.meta.currency)),
  }))

export const dishCollectionSchema = z.object({ data: z.array(dishSchema) })

export const dishResponseSchema = z.object({ data: dishSchema })

export type DishList = z.output<typeof dishListSchema>

const MAX_PRICE = 99_999_999.99

/**
 * The dish form. `anyLanguage` while saving translates what is written in
 * one language only: a name in either language then does. `pricedByBuilds`
 * for a dish with saved builds (while they are on): it needs no price of
 * its own, its variants and add-ons being extras on top. The form never
 * holds the builds; the Build your own page saves them.
 */
export function makeDishFormSchema(anyLanguage = false, pricedByBuilds = false) {
  return z
    .object({
      name: menuTextField(MENU_TEXT_LIMITS.dishName, () => t('menu:fields.name')),
      ingredients: menuTextField(MENU_TEXT_LIMITS.ingredients, () => t('menu:fields.ingredients')),
      price: z
        .number({ error: () => t('menu:dishSchema.priceInvalid') })
        .min(0, { error: () => t('menu:dishSchema.priceNegative') })
        .max(MAX_PRICE, { error: () => t('menu:dishSchema.priceTooHigh') })
        .nullable(),
      // Nullable on the way in so the form can start empty, but the parse
      // must yield a real id: a literal 0 used to slip through and be
      // sent as a foreign key.
      category_id: z
        .number()
        .int()
        .nullable()
        .pipe(
          z
            .number({ error: () => t('menu:dishSchema.categoryRequired') })
            .int()
            .positive({ error: () => t('menu:dishSchema.categoryRequired') }),
        ),
      is_available: z.boolean(),
      /** The main currency or the second one. */
      currency: z.string(),
      image: imageFieldSchema,
      /** Empty while the switch for them is off; they are not sent then. */
      variants: variantsField,
      addons: addonsField,
    })
    .superRefine(
      (values, ctx) => {
        requireMainLanguage(
          values.name,
          'name',
          (language) => t('menu:dishSchema.nameRequired', { language }),
          ctx,
          anyLanguage,
        )
        requireChoiceNames(values, ctx, anyLanguage)
        // A dish with no price of its own is priced by its builds, its
        // variants and add-ons then extras on top.
        if (pricedByBuilds) return
        // An add-on adds to the price, so the dish needs one, unless its
        // variants price it (a sandwich by size alone).
        if (values.price === null && values.addons.length > 0 && values.variants.length === 0) {
          ctx.addIssue({
            code: 'custom',
            path: ['price'],
            message: t('menu:dishSchema.priceForAddons'),
          })
        }
        // Priced by its first variant, each of its options needs a price: an
        // empty one would be a free sandwich, not a forgotten one.
        if (values.price === null) {
          values.variants[0]?.options.forEach((option, index) => {
            if (option.price === null) {
              ctx.addIssue({
                code: 'custom',
                path: ['variants', 0, 'options', index, 'price'],
                message: t('menu:dishSchema.optionPriceRequired'),
              })
            }
          })
        }
      },
      // Also when another field is wrong, so one submit shows every mistake
      // instead of revealing the missing name only after the rest is fixed.
      { when: () => true },
    )
}

export const dishFormSchema = makeDishFormSchema()

export type DishFormInput = z.input<typeof dishFormSchema>
export type DishFormValues = z.output<typeof dishFormSchema>
