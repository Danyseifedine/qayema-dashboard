import { z } from 'zod'
import { t } from '@/lib/i18n'
import type { Dish } from '@/features/menu'
import { MENU_TEXT_LIMITS } from '@/shared/constants/menu-text-limits'
import { ApiError, type ApiValidationErrors } from '@/shared/types/api'
import {
  menuTextField,
  requireMainLanguage,
  toMenuTextForm,
  type MenuText,
  type MenuTextForm,
} from '@/shared/utils/string/menu-text'
import {
  buildPriceCents,
  type BuildShape,
  type PartPrices,
} from '@/features/build-your-own/utils/build-price'

/**
 * A dish's "build your own" (a pizza half Margherita, half Pepperoni; three
 * scoops), as the Build your own page edits one at a time, with its dish: a
 * new build makes its dish, a saved one changes it. The rules mirror
 * ../qayema/docs/architecture/build-your-own.md: up to three builds a dish,
 * part counts 1 to 8, choices from a category's dishes (at their own prices)
 * or the owner's own list of 2 to 30.
 */

/** A build as its dish carries it (DishResource's `builds`). */
export type Build = Dish['builds'][number]

/** What one dish can carry, as ../qayema/config/menu.php's `dish_builds`. */
export const BUILD_LIMITS = { builds: 3, parts: 8, choices: 30 } as const

/** Every part count an owner may allow, 1 to 8. */
export const PART_COUNTS = Array.from({ length: BUILD_LIMITS.parts }, (_, index) => index + 1)

/** The counts shown before "More": a pizza is seldom cut in more than four. */
export const FIRST_COUNTS = 4

/** The most a price may be: a menu in Lebanese pounds runs to millions. */
const MAX_PRICE = 99_999_999.99

/** The three ways an owner starts a build, on the editor's first step. */
export const BUILD_KINDS = ['pizza', 'pieces', 'other'] as const
export type BuildKind = (typeof BUILD_KINDS)[number]

const price = z
  .number({ error: () => t('build-your-own:errors.priceInvalid') })
  .min(0, { error: () => t('build-your-own:errors.priceNegative') })
  .max(MAX_PRICE, { error: () => t('build-your-own:errors.priceTooHigh') })

/**
 * A choice's own price for one part, held as a list whose index is the
 * part count (index 2 is the price of a half), so a path reads like the
 * server's `part_prices.2`. Empty means its share of the whole.
 */
const partPricesField = z.array(price.nullable().optional())

const choiceRow = z.object({
  /** The saved row's id, so an edit keeps it; null for a new one. */
  savedId: z.number().int().nullable(),
  name: menuTextField(MENU_TEXT_LIMITS.choiceName, () => t('build-your-own:fields.choiceName')),
  price: price.nullable(),
  part_prices: partPricesField,
})

/**
 * The editor's form. `anyLanguage` while saving translates what is written
 * in one language only: a name in either language then does. The build's
 * title above its parts is the dish's name (`titleOf`); `name` keeps the
 * saved one only to send it back.
 */
export function makeBuildFormSchema(anyLanguage = false) {
  return z
    .object({
      /** The saved build's id; null for a new one. */
      savedId: z.number().int().nullable(),
      /** Step 1: the card it started from. */
      kind: z.enum(BUILD_KINDS).nullable(),
      /** Step 2: a category's dishes or the owner's own list. Both stay; only this one is sent. */
      source: z.enum(['category', 'own']),
      category_id: z.number().int().nullable(),
      /** The category's dishes guests may pick; null for every one, a dish added later too. */
      dish_ids: z.array(z.number().int()).nullable(),
      /** A category's dishes' part prices, by `d<dish id>`. */
      dish_prices: z.record(z.string(), partPricesField),
      choices: z.array(choiceRow).max(BUILD_LIMITS.choices, {
        error: () => t('build-your-own:errors.needChoices', { max: BUILD_LIMITS.choices }),
      }),
      /** Step 3: how it is made and the sizes allowed. */
      shape: z.enum(['split', 'pieces']),
      parts: z.array(z.number().int().min(1).max(BUILD_LIMITS.parts)).max(BUILD_LIMITS.parts),
      /** Step 4: the dish guests open above the menu's search: its name and icon. */
      dish: z.object({
        name: menuTextField(MENU_TEXT_LIMITS.dishName, () => t('build-your-own:fields.dishName')),
        icon: z.string().nullable(),
      }),
      name: menuTextField(MENU_TEXT_LIMITS.choiceName, () => t('build-your-own:fields.name')),
    })
    .superRefine(
      (values, ctx) => {
        const issue = (path: (string | number)[], message: string) =>
          ctx.addIssue({ code: 'custom', path, message })

        if (values.kind === null) issue(['kind'], t('build-your-own:errors.kindRequired'))

        if (values.source === 'category') {
          if (values.category_id === null) {
            issue(['category_id'], t('build-your-own:errors.categoryRequired'))
          }
        } else {
          if (values.choices.length < 2) {
            issue(
              ['choices'],
              t('build-your-own:errors.needChoices', { max: BUILD_LIMITS.choices }),
            )
          }
          values.choices.forEach((choice, index) => {
            requireMainLanguage(
              choice.name,
              `choices.${index}.name`,
              (language) => t('build-your-own:errors.choiceNameRequired', { language }),
              ctx,
              anyLanguage,
            )
            if (choice.price === null) {
              issue(['choices', index, 'price'], t('build-your-own:errors.choicePriceRequired'))
            }
          })
        }

        if (values.parts.length === 0) issue(['parts'], t('build-your-own:errors.partsRequired'))

        requireMainLanguage(
          values.dish.name,
          'dish.name',
          (language) => t('build-your-own:errors.dishNameRequired', { language }),
          ctx,
          anyLanguage,
        )
      },
      // Also when another field is wrong, so one save shows every mistake.
      { when: () => true },
    )
}

export const buildFormSchema = makeBuildFormSchema()

export type BuildFormInput = z.input<typeof buildFormSchema>
export type BuildFormValues = z.output<typeof buildFormSchema>
export type BuildChoiceForm = BuildFormInput['choices'][number]
export type PartPricesForm = z.input<typeof partPricesField>

/** The key a category's dish keeps its part prices under in the form. */
export function dishKey(id: number): string {
  return `d${id}`
}

/** The card a saved build matches: a split from a category is a pizza, pieces are scoops. */
export function kindOf(build: Pick<Build, 'shape' | 'category_id'>): BuildKind {
  if (build.shape === 'pieces') return 'pieces'
  return build.category_id === null ? 'other' : 'pizza'
}

/** Saved part prices as the form holds them: a list by part count. */
function toPartPricesForm(saved: Record<string, string>): PartPricesForm {
  return Array.from({ length: BUILD_LIMITS.parts + 1 }, (_, count) => {
    const value = saved[String(count)]
    return value === undefined || value === '' ? null : Number(value)
  })
}

/** A blank row of an own list. */
export function blankChoice(languages: readonly string[]): BuildChoiceForm {
  return { savedId: null, name: toMenuTextForm(null, languages), price: null, part_prices: [] }
}

/** The part of the form a build itself is: what a saved build reads into and the save sends. */
export type BuildFields = Pick<
  BuildFormInput,
  | 'savedId'
  | 'name'
  | 'shape'
  | 'parts'
  | 'source'
  | 'category_id'
  | 'dish_ids'
  | 'dish_prices'
  | 'choices'
>

/** A saved build as the form holds it, in every menu language. */
export function toBuildFields(build: Build, languages: readonly string[]): BuildFields {
  const fromCategory = build.category_id !== null
  return {
    savedId: build.id,
    name: toMenuTextForm(build.name, languages),
    shape: build.shape,
    parts: [...build.parts].sort((a, b) => a - b),
    source: fromCategory ? 'category' : 'own',
    category_id: build.category_id,
    dish_ids: fromCategory ? build.dish_ids : null,
    dish_prices: Object.fromEntries(
      build.choices.flatMap((choice) =>
        fromCategory && choice.dish_id !== null
          ? [[dishKey(choice.dish_id), toPartPricesForm(choice.part_prices)]]
          : [],
      ),
    ),
    choices: fromCategory
      ? []
      : build.choices
          .filter((choice) => choice.dish_id === null)
          .map((choice) => ({
            savedId: choice.id,
            name: toMenuTextForm(choice.name, languages),
            price: choice.price === null ? null : Number(choice.price),
            part_prices: toPartPricesForm(choice.part_prices),
          })),
  }
}

/** A dish as the editor reads it: what step 4 shows of it. */
type DishFields = Pick<Dish, 'name' | 'icon'>

/**
 * The editor's starting values: a saved build with its dish, the card it
 * matches chosen; or a new one, nothing chosen yet.
 */
export function toBuildForm(
  build: Build | null,
  dish: DishFields | null,
  languages: readonly string[],
): BuildFormInput {
  const fields: BuildFields = build
    ? toBuildFields(build, languages)
    : {
        savedId: null,
        name: toMenuTextForm(null, languages),
        shape: 'split',
        parts: [],
        source: 'own',
        category_id: null,
        dish_ids: null,
        dish_prices: {},
        choices: [],
      }
  return {
    ...fields,
    kind: build ? kindOf(build) : null,
    dish: { name: toMenuTextForm(dish?.name, languages), icon: dish?.icon ?? null },
  }
}

/** Each preset's dish name and icon, the name in the languages written. */
const PRESETS: Record<'pizza' | 'pieces', { dish: MenuText; icon: string }> = {
  pizza: { dish: { en: 'Build your pizza', ar: 'اصنع بيتزاك' }, icon: 'pizza' },
  pieces: { dish: { en: 'Ice cream', ar: 'بوظة' }, icon: 'ice-cream' },
}

/** Text the owner has not written: blank, or one of `presets` as it came. */
function untouched(text: MenuTextForm, presets: readonly MenuText[]): boolean {
  const written = Object.entries(text).filter(([, value]) => value.trim() !== '')
  return (
    written.length === 0 ||
    presets.some((preset) => written.every(([code, value]) => preset[code] === value))
  )
}

/** What a card sets, the dish's name and icon by their paths so nothing else of the dish moves. */
export type KindDefaults = Partial<Omit<BuildFormInput, 'dish'>> & {
  'dish.name'?: MenuTextForm
  'dish.icon'?: string | null
}

/**
 * What picking a card on the first step sets. A pizza is split, Whole and
 * Half & half, from the category named like pizza (`category`); scoops are
 * three pieces from an own list starting with three blank rows; something
 * else is a split own list with nothing picked. Each card names its dish
 * and gives it an icon ("Build your pizza" with a pizza); something else
 * leaves both to the owner. A name, an icon or rows the owner already
 * chose are kept.
 */
export function kindDefaults(
  kind: BuildKind,
  current: BuildFormInput,
  languages: readonly string[],
  category: number | null,
): KindDefaults {
  const preset = kind === 'other' ? null : PRESETS[kind]
  const all = Object.values(PRESETS)
  const presetIcon =
    current.dish.icon === null || all.some((each) => each.icon === current.dish.icon)
  const names: KindDefaults = {
    ...(presetIcon ? { 'dish.icon': preset?.icon ?? null } : {}),
    ...(untouched(
      current.dish.name,
      all.map((each) => each.dish),
    )
      ? { 'dish.name': toMenuTextForm(preset?.dish, languages) }
      : {}),
  }
  const blankRows = current.choices.every(
    (row) => row.price === null && Object.values(row.name).every((text) => text.trim() === ''),
  )
  const rows = (count: number) =>
    blankRows ? { choices: Array.from({ length: count }, () => blankChoice(languages)) } : {}

  if (kind === 'pizza') {
    return {
      ...names,
      shape: 'split',
      parts: [1, 2],
      source: 'category',
      category_id: current.category_id ?? category,
    }
  }
  if (kind === 'pieces') return { ...names, shape: 'pieces', parts: [3], source: 'own', ...rows(3) }
  return { ...names, shape: 'split', parts: [], source: 'own', ...rows(2) }
}

/** The title above the parts as it is saved: the dish's name, cut to a title's length. */
export function titleOf(values: Pick<BuildFormInput, 'dish'>): MenuTextForm {
  return Object.fromEntries(
    Object.entries(values.dish.name).map(([code, text]) => [
      code,
      text.trim().slice(0, MENU_TEXT_LIMITS.choiceName).trim(),
    ]),
  )
}

/**
 * The category a half and half most likely takes its dishes from: one named
 * like pizza, in any language, else the first.
 */
export function suggestedCategory(
  categories: readonly { id: number; name: MenuText }[],
): number | null {
  const pizza = categories.find((category) =>
    Object.values(category.name).some((name) => /pizza|بيتزا/i.test(name ?? '')),
  )
  return (pizza ?? categories[0])?.id ?? null
}

export type BuildChoicePayload = {
  id?: number
  dish_id?: number
  name?: MenuTextForm
  price?: number | null
  /** By part count; only the counts allowed over 1, only those typed. */
  part_prices?: Record<string, number>
}

export type BuildPayload = {
  id?: number
  name: MenuTextForm
  shape: BuildShape
  parts: number[]
  category_id: number | null
  /** Only these of the category's dishes; null for every one. */
  dish_ids: number[] | null
  choices: BuildChoicePayload[]
}

/**
 * The part prices to send: a split build's only, for the counts it allows
 * over 1 (a whole is the choice's own price), and only those typed.
 */
function toPartPricesPayload(
  build: Pick<BuildFields, 'shape' | 'parts'>,
  prices: PartPricesForm | undefined,
): Record<string, number> | null {
  if (build.shape !== 'split' || !prices) return null
  const sent: Record<string, number> = {}
  for (const count of build.parts) {
    const value = prices[count]
    if (count > 1 && typeof value === 'number' && Number.isFinite(value)) {
      sent[String(count)] = value
    }
  }
  return Object.keys(sent).length === 0 ? null : sent
}

/** A dish as the payload needs it: where it sits now. */
type Placed = { id: number; category_id: number | null }

/**
 * One build as the save sends it. A category's build sends the dishes it
 * offers (null for every one) and one row per dish of that category it
 * offers (any, even one sold out for now, so its prices are kept; never the
 * dish itself) that has a part price; its own list is left in the form for
 * a switch back but never sent.
 */
export function toBuildPayload(
  build: BuildFields,
  dishes: readonly Placed[],
  dishId: number | null,
): BuildPayload {
  const fromCategory = build.source === 'category'
  const choices: BuildChoicePayload[] = fromCategory
    ? dishes.flatMap((dish) => {
        if (dish.category_id !== build.category_id || dish.id === dishId) return []
        if (build.dish_ids !== null && !build.dish_ids.includes(dish.id)) return []
        const partPrices = toPartPricesPayload(build, build.dish_prices[dishKey(dish.id)])
        return partPrices === null ? [] : [{ dish_id: dish.id, part_prices: partPrices }]
      })
    : build.choices.map((choice) => {
        const partPrices = toPartPricesPayload(build, choice.part_prices)
        return {
          ...(choice.savedId === null ? {} : { id: choice.savedId }),
          name: choice.name,
          price: choice.price,
          ...(partPrices === null ? {} : { part_prices: partPrices }),
        }
      })

  return {
    ...(build.savedId === null ? {} : { id: build.savedId }),
    name: build.name,
    shape: build.shape,
    parts: [...new Set(build.parts)].sort((a, b) => a - b),
    category_id: fromCategory ? build.category_id : null,
    dish_ids: fromCategory ? build.dish_ids : null,
    choices,
  }
}

/**
 * A dish's saved builds, sent back as they are: the server keeps what the
 * list holds, so changing one build sends the others too.
 */
export function savedBuildsPayload(
  dish: Pick<Dish, 'id' | 'builds'>,
  dishes: readonly Placed[],
  languages: readonly string[],
): BuildPayload[] {
  return dish.builds.map((build) =>
    toBuildPayload(toBuildFields(build, languages), dishes, dish.id),
  )
}

/** A refused save's dish fields, by the server's name. */
const DISH_FIELDS: Record<string, string> = {
  name: 'dish.name',
  ingredients: 'dish.ingredients',
  category_id: 'dish.category_id',
  price: 'dish.price',
  image_key: 'dish.image',
  delete_image: 'dish.image',
}

/**
 * Where the editor shows one server error, or null for one it has no field
 * for (another build's, the dish's currency). `index` is this build's
 * place in what was sent. A category's rows are only the dishes sent, so
 * `builds.0.choices.1.part_prices.2` is the second dish sent, found by its
 * id; a dish no longer of the category is said at the category.
 */
function placeKey(key: string, sent: readonly BuildPayload[], index: number): string | null {
  const [root = '', ...more] = key.split('.')
  if (DISH_FIELDS[root]) return [DISH_FIELDS[root], ...more].join('.')

  const build = /^builds\.(\d+)\.(.+)$/.exec(key)
  if (!build || Number(build[1]) !== index) return null
  const rest = build[2]!
  const payload = sent[index]!
  if (/^parts(\.\d+)?$/.test(rest)) return 'parts'
  if (/^dish_ids(\.\d+)?$/.test(rest)) return 'dish_ids'
  if (rest === 'choices') return payload.category_id === null ? 'choices' : 'category_id'

  const row = /^choices\.(\d+)\.(.+)$/.exec(rest)
  if (!row || payload.category_id === null) return rest
  const dishId = payload.choices[Number(row[1])]?.dish_id
  const part = /^part_prices\.(\d+)$/.exec(row[2]!)
  return dishId !== undefined && part ? `dish_prices.${dishKey(dishId)}.${part[1]}` : 'category_id'
}

/**
 * The save's error with each message moved to the field the editor shows
 * it at, and the first one it has no field for, to say above the form.
 */
export function placeBuildErrors(
  error: unknown,
  sent: readonly BuildPayload[],
  index: number,
): { error: unknown; unplaced: string | null } {
  if (!(error instanceof ApiError) || !error.isValidation || !error.errors) {
    return { error, unplaced: null }
  }
  const placed: ApiValidationErrors = {}
  let unplaced: string | null = null
  for (const [key, messages] of Object.entries(error.errors)) {
    const at = placeKey(key, sent, index)
    if (at === null) unplaced ??= messages[0] ?? null
    // Two rows that land on one field say the first.
    else placed[at] ??= messages
  }
  return {
    error: new ApiError({
      message: error.message,
      status: error.status,
      code: error.code,
      errors: placed,
      body: error.body,
    }),
    unplaced,
  }
}

/** A dish a category's build can offer, as the dashboard lists them. */
type Offerable = {
  id: number
  category_id: number | null
  is_available: boolean
  price: string | null
  currency: string
  variants?: readonly { options: readonly { price: string }[] }[]
}

/**
 * The prices of a dish priced by size (a pizza with no price of its own):
 * its first variant's options, each a full price, as the server's
 * BuildChoices reads them. Empty for a dish with a price.
 */
export function sizePrices(dish: Offerable): number[] {
  if (dish.price !== null) return []
  return (dish.variants?.[0]?.options ?? []).map((option) => Number(option.price))
}

/** The least a dish costs in a build: its price, else its cheapest size. */
export function lowestPrice(dish: Offerable): number {
  return dish.price === null ? Math.min(...sizePrices(dish)) : Number(dish.price)
}

/**
 * The dishes of a category guests can pick in a build, the server's
 * BuildChoices: available, priced (or, while variants are on, `sized`,
 * priced by size), in the dish's currency, never the dish itself; in the
 * menu's order.
 */
export function offeredDishes<T extends Offerable>(
  dishes: readonly T[],
  categoryId: number | null,
  dishId: number | null,
  currency: string,
  sized = false,
): T[] {
  if (categoryId === null) return []
  return dishes.filter(
    (dish) =>
      dish.category_id === categoryId &&
      dish.id !== dishId &&
      dish.is_available &&
      (dish.price !== null || (sized && sizePrices(dish).length > 0)) &&
      dish.currency === currency,
  )
}

/**
 * The dishes a build offers of those its category could: the ones ticked,
 * or every one while it ticks none in particular (`dishIds` null).
 */
export function tickedDishes<T extends { id: number }>(
  offered: readonly T[],
  dishIds: readonly number[] | null | undefined,
): T[] {
  return dishIds == null ? [...offered] : offered.filter((dish) => dishIds.includes(dish.id))
}

/** One choice as the price example and the preview read it. */
export type ExampleChoice = { name: string; price: number; part_prices?: PartPrices }

/**
 * The choices of a build as a guest meets them, named and priced: a
 * category's offered dishes with their part prices (a dish priced by size
 * at its cheapest, with shares only, as the guest's sheet prices it), or
 * the own list's rows that have a price.
 */
export function choicesOf(
  build: Pick<BuildFields, 'source' | 'dish_prices' | 'choices'>,
  offered: readonly (Offerable & { name: MenuText })[],
  dishName: (name: MenuText) => string,
  rowName: (row: BuildChoiceForm, index: number) => string,
): ExampleChoice[] {
  if (build.source === 'category') {
    return offered.map((dish) => ({
      name: dishName(dish.name),
      price: lowestPrice(dish),
      part_prices: dish.price === null ? undefined : build.dish_prices[dishKey(dish.id)],
    }))
  }
  return build.choices.flatMap((row, index) =>
    row.price === null || !Number.isFinite(row.price)
      ? []
      : [{ name: rowName(row, index), price: row.price, part_prices: row.part_prices }],
  )
}

/**
 * A guest's build to show the owner what it costs: `count` parts (else the
 * smallest count over 1, else a whole when it is the only one), filled with
 * the first two choices in turn. Null without a count or a priced choice.
 */
export function buildExample(
  build: Pick<BuildFields, 'shape' | 'parts'>,
  choices: readonly ExampleChoice[],
  count?: number,
): { count: number; names: string[]; cents: number } | null {
  const counts = [...build.parts].sort((a, b) => a - b)
  if (counts.length === 0 || choices.length === 0) return null
  const parts = count ?? counts.find((value) => value > 1) ?? counts[0]!
  const picks = Array.from(
    { length: parts },
    (_, index) => choices[index % Math.min(2, choices.length)]!,
  )
  return {
    count: parts,
    names: picks.map((pick) => pick.name),
    cents: buildPriceCents(build.shape, picks),
  }
}
