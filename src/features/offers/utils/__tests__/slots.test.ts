import { describe, expect, it } from 'vitest'
import type { Offer } from '@/features/offers/schemas/offer.schema'
import {
  fullPlacesFor,
  offPackage,
  hasRoom,
  holdsSlot,
  slotUse,
} from '@/features/offers/utils/slots'

function offer(id: number, overrides: Partial<Offer> = {}): Offer {
  return {
    id,
    placements: ['banner'],
    is_active: true,
    status: 'live',
    ...overrides,
  } as Offer
}

const SLOTS = {
  banner: { used: 0, limit: 2 },
  popup: { used: 0, limit: 1 },
  ad: { used: 0, limit: null },
}

describe('slots', () => {
  it('counts offers switched on and not ended, as the server does', () => {
    expect(holdsSlot(offer(1))).toBe(true)
    expect(holdsSlot(offer(1, { status: 'scheduled' }))).toBe(true)
    expect(holdsSlot(offer(1, { is_active: false, status: 'paused' }))).toBe(false)
    expect(holdsSlot(offer(1, { status: 'ended' }))).toBe(false)

    const offers = [offer(1), offer(2, { status: 'ended' }), offer(3, { placements: ['popup'] })]
    expect(slotUse(offers, SLOTS, 'banner')).toEqual({ used: 1, limit: 2 })
    expect(slotUse(offers, SLOTS, 'ad')).toEqual({ used: 0, limit: null })
  })

  it('keeps a full place for the offers already in it', () => {
    const live = offer(1, { placements: ['popup'] })
    const paused = offer(2, { placements: ['popup', 'banner'], is_active: false, status: 'paused' })
    const offers = [live, paused]

    expect(hasRoom(offers, SLOTS, 'popup', live)).toBe(true)
    expect(hasRoom(offers, SLOTS, 'popup', paused)).toBe(false)
    expect(hasRoom(offers, SLOTS, 'popup', null)).toBe(false)
    expect(hasRoom(offers, SLOTS, 'banner', null)).toBe(true)
    expect(hasRoom(offers, SLOTS, 'ad', null)).toBe(true)
    expect(fullPlacesFor(offers, SLOTS, paused)).toEqual(['popup'])
  })

  it('leaves a place off the package out of switching on', () => {
    const off = { ...SLOTS, popup: { used: 0, limit: 0 } }
    const paused = offer(2, { placements: ['popup', 'banner'], is_active: false, status: 'paused' })

    expect(offPackage(off, 'popup')).toBe(true)
    expect(offPackage(off, 'banner')).toBe(false)
    // It shows as a banner; the pop-up it takes no slot in is not "full".
    expect(fullPlacesFor([paused], off, paused)).toEqual([])
  })
})
