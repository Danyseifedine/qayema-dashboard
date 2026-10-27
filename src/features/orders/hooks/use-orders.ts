import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query'
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
import { statusLabel } from '@/features/orders/utils/order-text'

/** The pages loaded so far as one list, and how many orders still wait. */
type LoadedOrders = { orders: Order[]; open: number }

/**
 * Orders placed in the menu, newest first, a page of 30 at a time: those to
 * a table, or the rest. `fetchNextPage` adds the next page ("Show more").
 *
 * The list never polls on its own: new and changed orders, and a status
 * moved in another tab, refresh it the moment Pusher says so, and while
 * Pusher cannot be heard each of useOrderPulse's minute checks refreshes it.
 * A refresh asks again for every page loaded.
 */
export function useOrders(
  kind: OrderKind,
  status: OrderStatus | null,
): UseInfiniteQueryResult<LoadedOrders, ApiError> {
  return useInfiniteQuery({
    queryKey: orderKeys.list(kind, status),
    queryFn: ({ pageParam, signal }) => fetchOrders(kind, status, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: ({ meta }: OrderList) =>
      meta.current_page < meta.last_page ? meta.current_page + 1 : undefined,
    select: joinPages,
    refetchOnWindowFocus: true,
  })
}

function joinPages(data: InfiniteData<OrderList, number>): LoadedOrders {
  const seen = new Set<number>()
  const orders: Order[] = []
  for (const page of data.pages) {
    for (const order of page.data) {
      // A new order pushes the others down a place, so the first order of a
      // page asked for later can be the last one of the page before.
      if (seen.has(order.id)) continue
      seen.add(order.id)
      orders.push(order)
    }
  }
  // The page asked for last has the freshest count.
  return { orders, open: data.pages.at(-1)?.meta.open ?? 0 }
}

/**
 * Moving an order on, or cancelling it. Every list is invalidated rather
 * than patched: an order can move out of the filter the owner is looking at,
 * and the open count on every one of them changes, the sidebar's too (the
 * pulse). A refusal (the guest changed it, or another tab moved it)
 * refreshes the lists, so the card shows the order as it now stands.
 */
export function useSetOrderStatus() {
  const queryClient = useQueryClient()

  return useMutation<Order, ApiError, { id: number; status: OrderStatus; guestUpdates?: number }>({
    mutationFn: ({ id, status, guestUpdates }) => setOrderStatus(id, status, guestUpdates),
    onSuccess: (order) => {
      toast.success(
        t('orders:toast.updated', {
          reference: order.reference,
          // In the card's words: a table order "marked Preparing", not "Accepted".
          status: t(`orders:${statusLabel(order)}`),
        }),
      )
      void queryClient.invalidateQueries({ queryKey: orderKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: orderKeys.pulse() })
    },
    onError: (error) => {
      toast.error(t('orders:toast.updateFailed'), error)
      if (error.status === 409) void queryClient.invalidateQueries({ queryKey: orderKeys.lists() })
    },
  })
}

/**
 * The restaurant changing what an order holds. A refusal (cancelled, or the
 * guest changed it meanwhile) refreshes the lists, like a status change.
 * Saving a new order accepts it, so the count waiting changes then: the
 * version seen (`guest_updates`) is sent only for a new order.
 */
export function useEditOrder() {
  const queryClient = useQueryClient()

  return useMutation<Order, ApiError, { id: number; edit: OrderEdit }>({
    mutationFn: ({ id, edit }) => editOrderItems(id, edit),
    onSuccess: (order, { edit }) => {
      toast.success(t('orders:toast.edited', { reference: order.reference }))
      void queryClient.invalidateQueries({ queryKey: orderKeys.lists() })
      if (edit.guest_updates !== undefined) {
        void queryClient.invalidateQueries({ queryKey: orderKeys.pulse() })
      }
    },
    onError: (error) => {
      toast.error(t('orders:toast.editFailed'), error)
      if (error.status === 409) void queryClient.invalidateQueries({ queryKey: orderKeys.lists() })
    },
  })
}

/**
 * Deleting an order for good: its lines and its place in the analytics go
 * too. A new one leaves the count waiting as well.
 */
export function useDeleteOrder() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, Order>({
    mutationFn: (order) => deleteOrder(order.id),
    onSuccess: (_nothing, order) => {
      toast.success(t('orders:toast.deleted', { reference: order.reference }))
      void queryClient.invalidateQueries({ queryKey: orderKeys.lists() })
      if (order.status === 'placed') {
        void queryClient.invalidateQueries({ queryKey: orderKeys.pulse() })
      }
    },
    onError: (error) => toast.error(t('orders:toast.deleteFailed'), error),
  })
}
