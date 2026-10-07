import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { t } from '@/lib/i18n'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'
import {
  deleteOrder,
  editOrderItems,
  fetchOrders,
  setOrderStatus,
  type OrderEdit,
} from '@/features/orders/api/order.api'
import type {
  Order,
  OrderKind,
  OrderList,
  OrderStatus,
} from '@/features/orders/schemas/order.schema'
import { orderKeys } from '@/features/orders/hooks/order-keys'

/**
 * Orders placed in the menu, newest first: those to a table, or the rest.
 *
 * New and changed orders refresh the list the moment they are heard
 * (useOrderPulse, through Pusher or its once-a-minute check). The list's own
 * minute is a safety net for a status moved in another tab while Pusher
 * could not be heard.
 */
export function useOrders(
  kind: OrderKind,
  status: OrderStatus | null,
): UseQueryResult<OrderList, ApiError> {
  return useQuery<OrderList, ApiError>({
    queryKey: orderKeys.list(kind, status),
    queryFn: ({ signal }) => fetchOrders(kind, status, signal),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
}

/**
 * Moving an order on, or cancelling it. Every list is invalidated rather
 * than patched: an order can move out of the filter the owner is looking at,
 * and the open count on every one of them changes. A refusal (the guest
 * changed it, or another tab moved it) refreshes them too, so the card shows
 * the order as it now stands.
 */
export function useSetOrderStatus() {
  const queryClient = useQueryClient()

  return useMutation<Order, ApiError, { id: number; status: OrderStatus; guestUpdates?: number }>({
    mutationFn: ({ id, status, guestUpdates }) => setOrderStatus(id, status, guestUpdates),
    onSuccess: (order) => {
      toast.success(
        t('orders:toast.updated', {
          reference: order.reference,
          status: t(`orders:status.${order.status}`),
        }),
      )
      void queryClient.invalidateQueries({ queryKey: orderKeys.all })
    },
    onError: (error) => {
      toast.error(t('orders:toast.updateFailed'), error)
      if (error.status === 409) void queryClient.invalidateQueries({ queryKey: orderKeys.all })
    },
  })
}

/**
 * The restaurant changing what an order holds. A refusal (cancelled, or the
 * guest changed it meanwhile) refreshes the lists, like a status change.
 */
export function useEditOrder() {
  const queryClient = useQueryClient()

  return useMutation<Order, ApiError, { id: number; edit: OrderEdit }>({
    mutationFn: ({ id, edit }) => editOrderItems(id, edit),
    onSuccess: (order) => {
      toast.success(t('orders:toast.edited', { reference: order.reference }))
      void queryClient.invalidateQueries({ queryKey: orderKeys.all })
    },
    onError: (error) => {
      toast.error(t('orders:toast.editFailed'), error)
      if (error.status === 409) void queryClient.invalidateQueries({ queryKey: orderKeys.all })
    },
  })
}

/** Deleting an order for good: its lines and its place in the analytics go too. */
export function useDeleteOrder() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, Order>({
    mutationFn: (order) => deleteOrder(order.id),
    onSuccess: (_nothing, order) => {
      toast.success(t('orders:toast.deleted', { reference: order.reference }))
      void queryClient.invalidateQueries({ queryKey: orderKeys.all })
    },
    onError: (error) => toast.error(t('orders:toast.deleteFailed'), error),
  })
}
