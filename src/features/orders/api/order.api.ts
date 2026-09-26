import { request } from '@/lib/api'
import {
  orderListSchema,
  orderResponseSchema,
  type Order,
  type OrderList,
  type OrderStatus,
} from '../schemas/order.schema'

export function fetchOrders(status: OrderStatus | null, signal?: AbortSignal): Promise<OrderList> {
  return request(orderListSchema, {
    method: 'GET',
    url: '/api/orders',
    params: status === null ? undefined : { status },
    signal,
  })
}

/**
 * The status is the only writable part of an order. What was ordered was
 * written once, by the guest, and the server refuses anything else.
 */
export async function setOrderStatus(id: number, status: OrderStatus): Promise<Order> {
  const { data } = await request(orderResponseSchema, {
    method: 'PATCH',
    url: `/api/orders/${id}`,
    data: { status },
  })
  return data
}
