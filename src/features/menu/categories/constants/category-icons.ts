import {
  IconApple,
  IconBaguette,
  IconBeer,
  IconBottle,
  IconBowlChopsticks,
  IconBowlSpoon,
  IconBread,
  IconBurger,
  IconCake,
  IconCarrot,
  IconCheese,
  IconChefHat,
  IconCoffee,
  IconCookie,
  IconEggFried,
  IconFish,
  IconFlame,
  IconGlassCocktail,
  IconGlassFull,
  IconGrill,
  IconIceCream,
  IconLeaf,
  IconMeat,
  IconMilkshake,
  IconPizza,
  IconSalad,
  IconSausage,
  IconSoup,
  IconTeapot,
  IconToolsKitchen2,
  type TablerIcon,
} from '@tabler/icons-react'

/**
 * The icons an owner can give a category, in the picker's order: the same
 * Tabler outline icons the menu draws (../qayema/app/Support/CategoryIcons.php),
 * keyed by their Tabler names. Add one in both.
 */
export const CATEGORY_ICONS = [
  { key: 'tools-kitchen-2', Icon: IconToolsKitchen2 },
  { key: 'chef-hat', Icon: IconChefHat },
  { key: 'salad', Icon: IconSalad },
  { key: 'soup', Icon: IconSoup },
  { key: 'pizza', Icon: IconPizza },
  { key: 'burger', Icon: IconBurger },
  { key: 'baguette', Icon: IconBaguette },
  { key: 'sausage', Icon: IconSausage },
  { key: 'meat', Icon: IconMeat },
  { key: 'grill', Icon: IconGrill },
  { key: 'fish', Icon: IconFish },
  { key: 'egg-fried', Icon: IconEggFried },
  { key: 'bread', Icon: IconBread },
  { key: 'bowl-chopsticks', Icon: IconBowlChopsticks },
  { key: 'bowl-spoon', Icon: IconBowlSpoon },
  { key: 'cheese', Icon: IconCheese },
  { key: 'carrot', Icon: IconCarrot },
  { key: 'leaf', Icon: IconLeaf },
  { key: 'flame', Icon: IconFlame },
  { key: 'apple', Icon: IconApple },
  { key: 'cake', Icon: IconCake },
  { key: 'ice-cream', Icon: IconIceCream },
  { key: 'cookie', Icon: IconCookie },
  { key: 'coffee', Icon: IconCoffee },
  { key: 'teapot', Icon: IconTeapot },
  { key: 'milkshake', Icon: IconMilkshake },
  { key: 'glass-full', Icon: IconGlassFull },
  { key: 'glass-cocktail', Icon: IconGlassCocktail },
  { key: 'beer', Icon: IconBeer },
  { key: 'bottle', Icon: IconBottle },
] as const satisfies readonly { key: string; Icon: TablerIcon }[]

/** One of the icons' keys. */
export type CategoryIconKey = (typeof CATEGORY_ICONS)[number]['key']

/** A category's icon component, or null for none (or one this dashboard does not know). */
export function categoryIcon(key: string | null | undefined): TablerIcon | null {
  return CATEGORY_ICONS.find((icon) => icon.key === key)?.Icon ?? null
}
