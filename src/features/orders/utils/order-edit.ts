import type { DishChoices } from '@/features/auth'
import { buildPriceCents, sizeKey } from '@/features/build-your-own'
import type { Dish } from '@/features/menu'
import { rateFor } from '@/shared/utils/format/money'
import type { MenuText } from '@/shared/utils/string/menu-text'
import { translated } from '@/shared/utils/string/translated'
import type { BuiltParts } from '@/features/orders/utils/order-text'

/** A dish's "build your own", as the menu reads it. */
type DishBuild = Dish['builds'][number]

/**
 * What the editor asks for on a dish: variants and add-ons, and builds while
 * the package has them; `main` is the menu's main language, which names a
 * build's sizes as the server does.
 */
export type PickChoices = DishChoices & { builds?: boolean; main?: string }

/** One choice a build's part may take at the size picked, keyed as the server names it ("d12", "c5"). */
export type BuildChoice = {
  key: string
  name: MenuText
  price: string
  part_prices: Record<string, unknown> | null
}

/**
 * A choice as the build offers it: a price of its own, or (a pizza with no
 * price, priced by its first variant) its price at each size by the size's key.
 */
type OfferedChoice = Omit<BuildChoice, 'price'> & {
  price: string | null
  sizes: Record<string, string>
}

/** One of a build's sizes: its key ("large") and its name. */
export type BuildSize = { key: string; name: MenuText }

/**
 * A build the owner has to fill to add its dish, with the choices it offers
 * and, when they are priced by size, its sizes (`choicesAt()` prices them).
 */
export type BuildToFill = Pick<DishBuild, 'id' | 'name' | 'shape' | 'parts'> & {
  choices: OfferedChoice[]
  sizes: BuildSize[]
}

/** What was picked for one build, as `add.*.builds` sends it; `size` for a build priced by size. */
export type PickedBuild = { build: number; parts: string[]; size?: string }

/**
 * A dish priced by its sizes (no price of its own): its first variant's
 * options by their key, each with its full price, as the server's
 * BuildChoices reads them. Empty with a price, or with variants off.
 */
function sizesOf(dish: Dish, choices: PickChoices): Map<string, { name: MenuText; price: string }> {
  const sizes = new Map<string, { name: MenuText; price: string }>()
  if (dish.price !== null || !choices.variants) return sizes
  for (const option of dish.variants[0]?.options ?? []) {
    const key = sizeKey(option.name, choices.main ?? 'en')
    if (key !== '' && !sizes.has(key)) sizes.set(key, { name: option.name, price: option.price })
  }
  return sizes
}

/**
 * A build's choices at `size`, the server's `BuildChoices::forSize()`: one
 * priced by size at that size (its share only), one with a price of its own
 * as it is, one without the size left out. With no sizes, every choice;
 * with sizes, none at a size it does not have.
 */
export function choicesAt(build: BuildToFill, size: string | null | undefined): BuildChoice[] {
  const bySize = (choice: OfferedChoice) => Object.keys(choice.sizes).length > 0
  if (build.sizes.length === 0) {
    return build.choices.map((choice) => ({ ...choice, price: choice.price ?? '0' }))
  }
  if (!build.sizes.some((each) => each.key === size)) return []
  return build.choices.flatMap((choice) => {
    if (!bySize(choice)) return [{ ...choice, price: choice.price ?? '0' }]
    const price = choice.sizes[size!]
    return price === undefined ? [] : [{ ...choice, price, part_prices: null }]
  })
}

/** The size a build starts at: the first with two choices to build from; undefined without sizes. */
export function firstSize(build: BuildToFill): string | undefined {
  return (
    build.sizes.find((size) => choicesAt(build, size.key).length >= 2)?.key ?? build.sizes[0]?.key
  )
}

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
 * the dish's currency, never the dish itself nor an offer's deal dish), in
 * the menu's order; else
 * the build's own list, each with a price.
 */
export function buildsToPick(
  dish: Dish,
  choices: PickChoices,
  menu: readonly Dish[],
): BuildToFill[] {
  if (!choices.builds) return []
  return dish.builds.flatMap((build) => {
    const offered = buildChoices(build, dish, menu, choices)
    const fill: BuildToFill = {
      id: build.id,
      name: build.name,
      shape: build.shape,
      parts: build.parts,
      choices: offered.choices,
      sizes: offered.sizes,
    }
    // Two choices or more, at one of its sizes at least when it has sizes.
    const enough =
      fill.sizes.length === 0
        ? fill.choices.length >= 2
        : fill.sizes.some((size) => choicesAt(fill, size.key).length >= 2)
    return enough ? [fill] : []
  })
}

function buildChoices(
  build: DishBuild,
  dish: Dish,
  menu: readonly Dish[],
  pick: PickChoices,
): { choices: OfferedChoice[]; sizes: BuildSize[] } {
  if (build.category_id === null) {
    return {
      sizes: [],
      choices: build.choices.flatMap((choice) =>
        choice.dish_id === null && choice.price !== null
          ? [
              {
                key: `c${choice.id}`,
                name: choice.name ?? {},
                price: choice.price,
                part_prices: choice.part_prices,
                sizes: {},
              },
            ]
          : [],
      ),
    }
  }
  // A row naming a dish only carries the part prices the owner set for it.
  const set = new Map(build.choices.map((choice) => [choice.dish_id, choice.part_prices]))
  const sizes = new Map<string, MenuText>()
  const choices = menu.flatMap((other): OfferedChoice[] => {
    const bySize = sizesOf(other, pick)
    if (
      other.category_id !== build.category_id ||
      (build.dish_ids !== null && !build.dish_ids.includes(other.id)) ||
      other.id === dish.id ||
      other.offer !== null ||
      !other.is_available ||
      (other.price === null && bySize.size === 0) ||
      other.currency !== dish.currency
    ) {
      return []
    }
    for (const [key, size] of bySize) if (!sizes.has(key)) sizes.set(key, size.name)
    return [
      {
        key: `d${other.id}`,
        name: other.name,
        price: other.price,
        part_prices: set.get(other.id) ?? null,
        sizes: Object.fromEntries([...bySize].map(([key, size]) => [key, size.price])),
      },
    ]
  })
  return { choices, sizes: [...sizes].map(([key, name]) => ({ key, name })) }
}

/**
 * Whether a build is filled as the server takes it: a size it has (when it
 * has sizes), a count it allows, a choice it offers at that size in each part.
 */
export function isFilled(build: BuildToFill, picked: PickedBuild | undefined): boolean {
  if (picked === undefined) return false
  const offered = choicesAt(build, picked.size)
  return (
    build.parts.includes(picked.parts.length) &&
    picked.parts.every((key) => offered.some((choice) => choice.key === key))
  )
}

/** The picked parts' choices, in the order picked, priced at the size picked. */
function partsOf(build: BuildToFill, picked: PickedBuild): BuildChoice[] {
  const offered = choicesAt(build, picked.size)
  return picked.parts.flatMap((key) => offered.filter((choice) => choice.key === key))
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
    const size = build.sizes.find((each) => each.key === mine.size)
    return [
      {
        name: translated(build.name, locale).text,
        parts: partsOf(build, mine).map((choice) => ({
          choice: translated(choice.name, locale).text,
          share,
        })),
        ...(size ? { size: translated(size.name, locale).text } : {}),
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
