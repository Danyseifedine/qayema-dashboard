import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'
import { fetchOrders, setOrderStatus } from '../api/order.api'
import {
  ORDER_STATUS_LABELS,
  type Order,
  type OrderList,
  type OrderStatus,
} from '../schemas/order.schema'
import { orderKeys } from './order-keys'

/**
 * Orders for the restaurant, newest first.
 *
 * Refetched on a timer while the page is open: an order arrives from a guest's
 * phone, and nothing in this product pushes. WhatsApp is what actually gets the
 * owner's attention — this is so the page is not stale when they look at it.
 */
export function useOrders(status: OrderStatus | null): UseQueryResult<OrderList, ApiError> {
  return useQuery<OrderList, ApiError>({
    queryKey: orderKeys.list(status),
    queryFn: ({ signal }) => fetchOrders(status, signal),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
}

/**
 * Marking an order done or cancelled. Every list is invalidated rather than
 * patched: an order can move out of the filter the owner is looking at, and
 * the open count on every one of them changes.
 */
export function useSetOrderStatus() {
  const queryClient = useQueryClient()

  return useMutation<Order, ApiError, { id: number; status: OrderStatus }>({
    mutationFn: ({ id, status }) => setOrderStatus(id, status),
    onSuccess: (order) => {
      toast.success(`Order ${order.reference} marked ${ORDER_STATUS_LABELS[order.status]}`)
      void queryClient.invalidateQueries({ queryKey: orderKeys.all })
    },
    onError: (error) => toast.error('Could not update that order', error),
  })
}
