import type { Offer, OfferSlots, Placement } from '@/features/offers/schemas/offer.schema'
import { OVERLAYS } from '@/features/offers/schemas/offer.schema'
import type { OfferParts } from '@/features/offers/hooks/use-offer-parts'
import { discountApplies } from '@/features/offers/utils/discount'
import { offPackage } from '@/features/offers/utils/slots'

/** A dish as the warnings need it: on the menu or not, and its own price. */
export type MenuDish = {
  id: number
  name: string
  /** In its own currency. */
  price: string | null
  /** What one of its currency is worth in the main one (1 for the main). */
  rate: number
  /** Shown to guests: available, in a category. */
  shown: boolean
}

/** Something about an offer the owner should know before guests meet it. */
export type OfferWarning =
  | { kind: 'noDishes' }
  | { kind: 'allHidden' }
  | { kind: 'tooBig'; dishes: string[] }
  | { kind: 'waits'; behind: Offer }
  /** The package keeps it off the menu: a schedule it does not run, or none of its places. */
  | { kind: 'schedulesOff' }
  | { kind: 'placesOff' }
  /** One of its places is not on the package: it does not show there. */
  | { kind: 'placeOff'; place: Placement }
  /** Its discount is not on the package: it shows as a promotion. */
  | { kind: 'discountOff' }

/** Live or still to come: what a guest may get over the menu. */
function counts(offer: Offer): boolean {
  return offer.is_active && (offer.status === 'live' || offer.status === 'scheduled')
}

function isOverlay(offer: Offer): boolean {
  return offer.placements.some((placement) => OVERLAYS.includes(placement))
}

/**
 * What may go wrong with an offer on the menu, worked out from the dishes
 * and the other offers in hand:
 * - its discount or "show its dishes" has no dish left (all deleted);
 * - every dish it names is hidden from guests;
 * - a fixed amount takes all of some dish's price, so it does not apply there;
 * - it is a pop-up or an ad behind another one: a guest gets one a visit,
 *   the first in the owner's order;
 * - the package lacks part of it (`package`): kept off the menu (the server's
 *   `kept_off`), off one of its places (a count of 0), or without its
 *   discount.
 * `dishes` is undefined while they load: the dish checks wait for them.
 */
export function offerWarnings(
  offer: Offer,
  offers: readonly Offer[],
  dishes: readonly MenuDish[] | undefined,
  pkg?: { parts: OfferParts; slots: OfferSlots | undefined },
): OfferWarning[] {
  const warnings: OfferWarning[] = []

  if (offer.kept_off === 'schedules') warnings.push({ kind: 'schedulesOff' })
  else if (offer.kept_off === 'places') warnings.push({ kind: 'placesOff' })
  else if (pkg?.slots !== undefined) {
    for (const place of offer.placements) {
      if (offPackage(pkg.slots, place)) warnings.push({ kind: 'placeOff', place })
    }
  }
  if (pkg !== undefined && !pkg.parts.discounts && offer.discount_type !== 'none') {
    warnings.push({ kind: 'discountOff' })
  }
  const needsDishes = offer.discount_type !== 'none' || offer.action === 'dishes'

  if (needsDishes && offer.dish_ids.length === 0) {
    warnings.push({ kind: 'noDishes' })
  } else if (needsDishes && dishes !== undefined) {
    const chosen = dishes.filter((dish) => offer.dish_ids.includes(dish.id))
    if (chosen.every((dish) => !dish.shown)) warnings.push({ kind: 'allHidden' })

    if (offer.discount_type === 'amount') {
      const value = Number(offer.discount_value ?? 0)
      const free = chosen.filter(
        (dish) =>
          dish.price !== null &&
          !discountApplies(Math.round(Number(dish.price) * 100), 'amount', value, dish.rate),
      )
      if (free.length > 0) warnings.push({ kind: 'tooBig', dishes: free.map((dish) => dish.name) })
    }
  }

  if (isOverlay(offer) && counts(offer)) {
    const first = offers.find((other) => isOverlay(other) && counts(other))
    if (first !== undefined && first.id !== offer.id)
      warnings.push({ kind: 'waits', behind: first })
  }

  return warnings
}
