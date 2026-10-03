import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { t } from '@/lib/i18n'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'
import { fetchOrders, setOrderStatus } from '@/features/orders/api/order.api'
import type { Order, OrderList, OrderStatus } from '@/features/orders/schemas/order.schema'
import { orderKeys } from '@/features/orders/hooks/order-keys'

/**
 * Orders placed in the menu, newest first.
 *
 * New and changed orders refresh the list the moment they are heard
 * (useOrderPulse, through Pusher or its once-a-minute check). The list's own
 * minute is a safety net for a status moved in another tab while Pusher
 * could not be heard.
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
