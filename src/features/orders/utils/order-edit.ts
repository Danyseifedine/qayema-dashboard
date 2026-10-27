import type { DishChoices } from '@/features/auth'
import { buildPriceCents } from '@/features/build-your-own'
import type { Dish } from '@/features/menu'
import { rateFor } from '@/shared/utils/format/money'
import type { MenuText } from '@/shared/utils/string/menu-text'
import { translated } from '@/shared/utils/string/translated'
import type { BuiltParts } from '@/features/orders/utils/order-text'

/** A dish's "build your own", as the menu reads it. */
type DishBuild = Dish['builds'][number]

/** What the editor asks for on a dish: variants and add-ons, and builds while the package has them. */
export type PickChoices = DishChoices & { builds?: boolean }

/** One choice a build's part may take, keyed as the server names it ("d12", "c5"). */
export type BuildChoice = {
  key: string
  name: MenuText
  price: string
  part_prices: Record<string, unknown> | null
}

/** A build the owner has to fill to add its dish, with the choices it offers. */
export type BuildToFill = Pick<DishBuild, 'id' | 'name' | 'shape' | 'parts'> & {
  choices: BuildChoice[]
}

/** What was picked for one build, as `add.*.builds` sends it. */
export type PickedBuild = { build: number; parts: string[] }

/** A dish's variants the guest has to pick in, as the menu asks them: two options or more. */
export function variantsToPick(dish: Dish, choices: DishChoices): Dish['variants'] {
  return choices.variants ? dish.variants.filter((variant) => variant.options.length >= 2) : []
}

/** The add-ons that can go on a dish, while the restaurant shows them. */
export function addonsToPick(dish: Dish, choices: DishChoices): Dish['addons'] {
  return choices.addons ? dish.addons : []
}

/**
 * The builds the owner fills to add a dish, as the server asks them
 * (OrderPlacer::buildChoices, over BuildChoices): only while the package
 * has them, and only a build offering two choices or more. A category
 * build offers that category's dishes guests can buy (only those ticked
 * when it ticks some; shown, priced, in
 * the dish's currency, never the dish itself), in the menu's order; else
 * the build's own list, each with a price.
 */
export function buildsToPick(
  dish: Dish,
  choices: PickChoices,
  menu: readonly Dish[],
): BuildToFill[] {
  if (!choices.builds) return []
  return dish.builds.flatMap((build) => {
    const offered = buildChoices(build, dish, menu)
    return offered.length >= 2
      ? [
          {
            id: build.id,
            name: build.name,
            shape: build.shape,
            parts: build.parts,
            choices: offered,
          },
        ]
      : []
  })
}

function buildChoices(build: DishBuild, dish: Dish, menu: readonly Dish[]): BuildChoice[] {
  if (build.category_id === null) {
    return build.choices.flatMap((choice) =>
      choice.dish_id === null && choice.price !== null
        ? [
            {
              key: `c${choice.id}`,
              name: choice.name ?? {},
              price: choice.price,
              part_prices: choice.part_prices,
            },
          ]
        : [],
    )
  }
  // A row naming a dish only carries the part prices the owner set for it.
  const set = new Map(build.choices.map((choice) => [choice.dish_id, choice.part_prices]))
  return menu.flatMap((other) =>
    other.category_id === build.category_id &&
    (build.dish_ids === null || build.dish_ids.includes(other.id)) &&
    other.id !== dish.id &&
    other.is_available &&
    other.price !== null &&
    other.currency === dish.currency
      ? [
          {
            key: `d${other.id}`,
            name: other.name,
            price: other.price,
            part_prices: set.get(other.id) ?? null,
          },
        ]
      : [],
  )
}

/** Whether a build is filled as the server takes it: a count it allows, a choice it offers in each part. */
export function isFilled(build: BuildToFill, picked: PickedBuild | undefined): boolean {
  return (
    picked !== undefined &&
    build.parts.includes(picked.parts.length) &&
    picked.parts.every((key) => build.choices.some((choice) => choice.key === key))
  )
}

/** The picked parts' choices, in the order picked. */
function partsOf(build: BuildToFill, picked: PickedBuild): BuildChoice[] {
  return picked.parts.flatMap((key) => build.choices.filter((choice) => choice.key === key))
}

/** What the filled builds add to one of the dish, each priced by `buildPriceCents`. */
export function buildsCost(builds: readonly BuildToFill[], picked: readonly PickedBuild[]): number {
  return builds.reduce((sum, build) => {
    const mine = picked.find((candidate) => candidate.build === build.id)
    return mine && isFilled(build, mine)
      ? sum + buildPriceCents(build.shape, partsOf(build, mine)) / 100
      : sum
  }, 0)
}

/**
 * The filled builds as a line will keep them, named in `locale`, for
 * `choiceParts`: each part of a split is one Nth of it, a piece one whole.
 */
export function builtParts(
  builds: readonly BuildToFill[],
  picked: readonly PickedBuild[],
  locale: string,
): BuiltParts[] {
  return builds.flatMap((build) => {
    const mine = picked.find((candidate) => candidate.build === build.id)
    if (!mine || !isFilled(build, mine)) return []
    const share = build.shape === 'split' ? mine.parts.length : 1
    return [
      {
        name: translated(build.name, locale).text,
        parts: partsOf(build, mine).map((choice) => ({
          choice: translated(choice.name, locale).text,
          share,
        })),
      },
    ]
  })
}

/**
 * Whether the dish can be sold at all: it has a price, or variants or
 * builds to price it (a sandwich by size alone, a pizza by its halves). The
 * server leaves anything else out.
 */
export function isSellable(dish: Dish, choices: PickChoices, menu: readonly Dish[] = []): boolean {
  return (
    dish.price !== null ||
    variantsToPick(dish, choices).length > 0 ||
    buildsToPick(dish, choices, menu).length > 0
  )
}

/**
 * What one of a dish costs with the choices picked, as the server will price
 * it (OrderPlacer): the dish, plus each option, add-on and filled build.
 * `menu` is where a category build's dishes come from.
 */
export function unitPrice(
  dish: Dish,
  options: readonly number[],
  addons: readonly number[],
  choices: PickChoices,
  builds: readonly PickedBuild[] = [],
  menu: readonly Dish[] = [],
): number {
  let price = dish.price === null ? 0 : Number(dish.price)
  for (const variant of variantsToPick(dish, choices)) {
    const picked = variant.options.find((option) => options.includes(option.id))
    if (picked) price += Number(picked.price)
  }
  for (const addon of addonsToPick(dish, choices)) {
    if (addons.includes(addon.id)) price += Number(addon.price)
  }
  return price + buildsCost(buildsToPick(dish, choices, menu), builds)
}

/**
 * An order's total in its own (main) currency, added up as the server does:
 * a line in the second currency counts for its amount times the rate, to
 * the cent, and the lines are then summed.
 */
export function orderTotal(
  lines: readonly { amount: number; currency: string }[],
  main: string,
  exchangeRate: string | null,
): number {
  const cents = lines.reduce(
    (sum, line) =>
      sum + Math.round(Math.round(line.amount * 100) * rateFor(line.currency, main, exchangeRate)),
    0,
  )
  return cents / 100
}
