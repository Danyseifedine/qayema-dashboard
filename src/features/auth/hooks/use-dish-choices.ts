import { useMemo } from 'react'
import { useSession } from '@/features/auth/hooks/use-session'

export type DishChoices = {
  /** Variants (size, spice level) are on: in the package and not switched off. */
  variants: boolean
  /** Add-ons (extra cheese) are on: in the package and not switched off. */
  addons: boolean
}

/**
 * Whether the dish form shows its variants and add-ons. The same rule as the
 * server's Restaurant::showsVariants() and showsAddons(): a list that is off
 * stays saved but is neither shown nor sent.
 */
export function useDishChoices(): DishChoices {
  const restaurant = useSession().data?.restaurant
  const variants =
    Boolean(restaurant?.plan.variants) && !restaurant?.switched_off.includes('variants')
  const addons = Boolean(restaurant?.plan.addons) && !restaurant?.switched_off.includes('addons')

  return useMemo(() => ({ variants, addons }), [variants, addons])
}

/**
 * Whether "build your own" (half and half pizzas) is on: the server's
 * Restaurant::showsBuilds(). No package has it and the owner cannot switch
 * it off; an admin turns it on per restaurant. The dish form then lets saved
 * builds price a dish and points to the Build your own page; while off,
 * saved builds stay as they are.
 */
export function useDishBuilds(): boolean {
  return Boolean(useSession().data?.restaurant?.plan.build_your_own)
}
