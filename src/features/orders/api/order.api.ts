import { request } from '@/lib/api'
import {
  orderListSchema,
  orderPulseSchema,
  orderResponseSchema,
  type Order,
  type OrderList,
  type OrderPulse,
  type OrderStatus,
} from '@/features/orders/schemas/order.schema'

export function fetchOrders(status: OrderStatus | null, signal?: AbortSignal): Promise<OrderList> {
  return request(orderListSchema, {
    method: 'GET',
    url: '/api/orders',
    params: status === null ? undefined : { status },
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
