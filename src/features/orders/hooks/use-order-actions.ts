import { useCallback, useState } from 'react'
import { useDeleteOrder, useSetOrderStatus } from '@/features/orders/hooks/use-orders'
import type { Order, OrderStatus } from '@/features/orders/schemas/order.schema'

/**
 * What a list of order cards does with them, the same on Orders and on Table
 * orders: move one on, cancel one after asking (CancelOrderDialog), change
 * what it holds (EditOrderDialog), and delete it after asking
 * (DeleteOrderDialog).
 */
export function useOrderActions() {
  const setStatus = useSetOrderStatus()
  const remove = useDeleteOrder()
  const [pendingCancel, setPendingCancel] = useState<Order | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Order | null>(null)
  const [editing, setEditing] = useState<Order | null>(null)

  const move = useCallback(
    (order: Order, status: OrderStatus) =>
      setStatus.mutate({
        id: order.id,
        status,
        // Taking on a new order means the version on this card.
        guestUpdates: order.status === 'placed' ? order.guest_updates : undefined,
      }),
    [setStatus],
  )
  const askCancel = useCallback((order: Order) => setPendingCancel(order), [])
  const askDelete = useCallback((order: Order) => setPendingDelete(order), [])
  const startEdit = useCallback((order: Order) => setEditing(order), [])

  const cancel = () => {
    if (pendingCancel) {
      setStatus.mutate(
        { id: pendingCancel.id, status: 'cancelled' },
        { onSuccess: () => setPendingCancel(null) },
      )
    }
  }

  return {
    move,
    askCancel,
    askDelete,
    startEdit,
    /** Whether a card's button is the one waiting on the server. */
    busy: (order: Order) => setStatus.isPending && setStatus.variables?.id === order.id,
    cancelDialog: {
      open: pendingCancel !== null,
      loading: setStatus.isPending,
      onConfirm: cancel,
      onCancel: () => setPendingCancel(null),
    },
    deleteDialog: {
      order: pendingDelete,
      loading: remove.isPending,
      onConfirm: () => {
        if (pendingDelete) remove.mutate(pendingDelete, { onSuccess: () => setPendingDelete(null) })
      },
      onCancel: () => setPendingDelete(null),
    },
    editDialog: { order: editing, onClose: () => setEditing(null) },
  }
}
