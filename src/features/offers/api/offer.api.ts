import { z } from 'zod'
import { request } from '@/lib/api'
import {
  offerCollectionSchema,
  offerListSchema,
  offerResponseSchema,
  type Offer,
  type OfferList,
  type OfferPayload,
} from '@/features/offers/schemas/offer.schema'

export function fetchOffers(signal?: AbortSignal): Promise<OfferList> {
  return request(offerListSchema, { method: 'GET', url: '/api/offers', signal })
}

export async function createOffer(payload: OfferPayload): Promise<Offer> {
  const { data } = await request(offerResponseSchema, {
    method: 'POST',
    url: '/api/offers',
    data: payload,
  })
  return data
}

/** The editor sends the offer whole, as it does a new one. */
export async function updateOffer(id: number, payload: OfferPayload): Promise<Offer> {
  const { data } = await request(offerResponseSchema, {
    method: 'PATCH',
    url: `/api/offers/${id}`,
    data: payload,
  })
  return data
}

/** Pause or resume, without the rest of the offer. */
export async function setOfferActive(id: number, active: boolean): Promise<Offer> {
  const { data } = await request(offerResponseSchema, {
    method: 'PATCH',
    url: `/api/offers/${id}/active`,
    data: { is_active: active },
  })
  return data
}

/** 204. */
export async function deleteOffer(id: number): Promise<void> {
  await request(z.unknown(), { method: 'DELETE', url: `/api/offers/${id}` })
}

/** The offers in their new order, as the server now has them. */
export async function reorderOffers(ids: number[]): Promise<Offer[]> {
  const { data } = await request(offerCollectionSchema, {
    method: 'POST',
    url: '/api/offers/reorder',
    data: { ids },
  })
  return data
}
