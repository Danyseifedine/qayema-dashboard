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
