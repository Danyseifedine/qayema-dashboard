import { z } from 'zod'
import { request } from '@/lib/api'
import {
  orderListSchema,
  orderPulseSchema,
  orderResponseSchema,
  type Order,
  type OrderList,
  type OrderPulse,
  type OrderKind,
  type OrderStatus,
} from '@/features/orders/schemas/order.schema'

export function fetchOrders(
  kind: OrderKind,
  status: OrderStatus | null,
  signal?: AbortSignal,
): Promise<OrderList> {
  return request(orderListSchema, {
    method: 'GET',
    url: '/api/orders',
    params: status === null ? { kind } : { kind, status },
    signal,
  })
}

export async function fetchOrderPulse(signal?: AbortSignal): Promise<OrderPulse> {
  const { data } = await request(orderPulseSchema, {
    method: 'GET',
    url: '/api/orders/pulse',
    signal,
  })
  return data
}

/**
 * The status is the only writable part of an order. What was ordered is the
 * guest's, and the server refuses anything else.
 *
 * Taking on a new order sends how many times the guest had changed it when
 * the card showed it (`guestUpdates`): a change made since is refused (409),
 * so the owner never accepts a version they have not seen. The server also
 * refuses a step back (a tab showing an old state).
 */
export async function setOrderStatus(
  id: number,
  status: OrderStatus,
  guestUpdates?: number,
): Promise<Order> {
  const { data } = await request(orderResponseSchema, {
    method: 'PATCH',
    url: `/api/orders/${id}`,
    data: guestUpdates === undefined ? { status } : { status, guest_updates: guestUpdates },
  })
  return data
}

/** What the owner sends to change an order: the lines kept and the dishes added. */
export type OrderEdit = {
  /** Each line kept, with its quantity; a line left out (or at 0) goes. */
  items: { id: number; quantity: number }[]
  add: { dish_id: number; quantity: number; options: number[]; addons: number[] }[]
  /** The version the card showed, as with a status change. */
  guest_updates?: number
}

/**
 * The restaurant changes what an order holds. Kept lines keep what they were
 * sold as; added dishes are priced from the menu by the server.
 */
export async function editOrderItems(id: number, edit: OrderEdit): Promise<Order> {
  const { data } = await request(orderResponseSchema, {
    method: 'PUT',
    url: `/api/orders/${id}/items`,
    data: edit,
  })
  return data
}

/** 204. The order and its lines are gone for good. */
export async function deleteOrder(id: number): Promise<void> {
  await request(z.unknown(), { method: 'DELETE', url: `/api/orders/${id}` })
}
