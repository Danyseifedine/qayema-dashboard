import type { Offer, OfferSlots, Placement } from '@/features/offers/schemas/offer.schema'

/** Uses a slot as the server counts it: switched on and not ended (paused or ended ones are free). */
export function holdsSlot(offer: Pick<Offer, 'is_active' | 'status'>): boolean {
  return offer.is_active && offer.status !== 'ended'
}

/** A place's use now, counted from the offers in hand so a pause shows at once. */
export type SlotUse = { used: number; limit: number | null }

export function slotUse(
  offers: readonly Offer[],
  slots: OfferSlots,
  placement: Placement,
): SlotUse {
  return {
    used: offers.filter((offer) => holdsSlot(offer) && offer.placements.includes(placement)).length,
    limit: slots[placement].limit,
  }
}

/**
 * Whether `offer` (null for a new one) can take `placement` and be switched
 * on: it already holds a slot there, the place is unlimited, or one is free.
 */
export function hasRoom(
  offers: readonly Offer[],
  slots: OfferSlots,
  placement: Placement,
  offer: Pick<Offer, 'id' | 'is_active' | 'status' | 'placements'> | null,
): boolean {
  const { used, limit } = slotUse(offers, slots, placement)
  if (limit === null) return true
  const saved = offer === null ? undefined : offers.find((other) => other.id === offer.id)
  const held = saved !== undefined && holdsSlot(saved) && saved.placements.includes(placement)
  return held || used < limit
}

/** The package leaves this place out (a count of 0): an offer takes no slot there. */
export function offPackage(slots: OfferSlots, placement: Placement): boolean {
  return slots[placement].limit === 0
}

/**
 * The places switching a paused offer on would go over, in order. A place
 * off the package is not one: the offer shows in its others.
 */
export function fullPlacesFor(
  offers: readonly Offer[],
  slots: OfferSlots,
  offer: Offer,
): Placement[] {
  return offer.placements.filter(
    (placement) => !offPackage(slots, placement) && !hasRoom(offers, slots, placement, offer),
  )
}
