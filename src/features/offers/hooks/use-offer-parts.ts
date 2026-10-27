import { useMemo } from 'react'
import { useSession } from '@/features/auth'

/** The parts of offers the package has, beside the places' counts (`meta.slots`). */
export type OfferParts = {
  /** Offers may run on a schedule; without it, always (OfferRules). */
  schedules: boolean
  /** Offers may take a discount; without it, a promotion only. */
  discounts: boolean
}

/** Read from the session's plan, the same as the server's OfferRules. */
export function useOfferParts(): OfferParts {
  const plan = useSession().data?.restaurant?.plan
  const schedules = plan?.offer_schedules ?? false
  const discounts = plan?.offer_discounts ?? false

  return useMemo(() => ({ schedules, discounts }), [schedules, discounts])
}
