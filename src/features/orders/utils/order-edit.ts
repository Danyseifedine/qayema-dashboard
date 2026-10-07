import type { DishChoices } from '@/features/auth'
import type { Dish } from '@/features/menu'

/** A dish's variants the guest has to pick in, as the menu asks them: two options or more. */
export function variantsToPick(dish: Dish, choices: DishChoices): Dish['variants'] {
  return choices.variants ? dish.variants.filter((variant) => variant.options.length >= 2) : []
}

/** The add-ons that can go on a dish, while the restaurant shows them. */
export function addonsToPick(dish: Dish, choices: DishChoices): Dish['addons'] {
  return choices.addons ? dish.addons : []
}

/**
 * Whether the dish can be sold at all: it has a price, or variants to price
 * it (a sandwich by size alone). The server leaves anything else out.
 */
export function isSellable(dish: Dish, choices: DishChoices): boolean {
  return dish.price !== null || variantsToPick(dish, choices).length > 0
}

/**
 * What one of a dish costs with the choices picked, as the server will price
 * it (OrderPlacer): the dish, plus each option and add-on.
 */
export function unitPrice(
  dish: Dish,
  options: readonly number[],
  addons: readonly number[],
  choices: DishChoices,
): number {
  let price = dish.price === null ? 0 : Number(dish.price)
  for (const variant of variantsToPick(dish, choices)) {
    const picked = variant.options.find((option) => options.includes(option.id))
    if (picked) price += Number(picked.price)
  }
  for (const addon of addonsToPick(dish, choices)) {
    if (addons.includes(addon.id)) price += Number(addon.price)
  }
  return price
}
