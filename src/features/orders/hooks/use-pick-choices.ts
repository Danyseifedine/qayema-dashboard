import { useMemo } from 'react'
import { useDishChoices, useMenuLanguages, useSession } from '@/features/auth'
import type { PickChoices } from '@/features/orders/utils/order-edit'

/**
 * What the order editor asks for on a dish: the variants and add-ons the
 * restaurant shows, and its builds while the package has "build your own"
 * (`plan.build_your_own`, the server's `showsBuilds()`). Without it the
 * server prices a dish as if it had no builds, so none are asked. The
 * menu's main language names a build's sizes, as the server's do.
 */
export function usePickChoices(): PickChoices {
  const dishChoices = useDishChoices()
  const builds = useSession().data?.restaurant?.plan.build_your_own ?? false
  const main = useMenuLanguages()[0]

  return useMemo(() => ({ ...dishChoices, builds, main }), [dishChoices, builds, main])
}
