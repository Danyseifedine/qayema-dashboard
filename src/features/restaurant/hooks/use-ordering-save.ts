import type { QueryClient } from '@tanstack/react-query'
import { analyticsKeys } from '@/features/analytics'
import type { AuthRestaurant, AuthUser } from '@/features/auth'
import { orderKeys } from '@/features/orders'
import {
  saveDineIn,
  saveOrdering,
  saveWhatsAppFields,
  type DineInMode,
  type OrderingSettings,
  type WhatsAppFieldsSettings,
} from '@/features/restaurant/api/ordering.api'
import { patchRestaurant, useSessionSave } from '@/features/restaurant/hooks/use-session-save'

function withOrdering(
  user: AuthUser | undefined,
  ordering: Partial<AuthRestaurant['ordering']>,
): AuthUser | undefined {
  return patchRestaurant(user, (restaurant) => ({
    ordering: { ...restaurant.ordering, ...ordering },
  }))
}

/** After either save: the order pages and analytics read differently now. */
function refreshOrderViews(_saved: unknown, queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: orderKeys.all })
  // Reset, not invalidated, so analytics opens on its skeleton rather than
  // the old way's numbers: each counts only its own orders.
  void queryClient.resetQueries({ queryKey: analyticsKeys.all })
}

/**
 * Saves how guests send their orders. Optimistic like the feature switches:
 * the choice moves on the tap and snaps back with an error toast if the
 * save fails.
 */
export function useSaveOrdering() {
  return useSessionSave<OrderingSettings>(saveOrdering, withOrdering, refreshOrderViews)
}

/**
 * Saves how orders at the table come in: the Table orders page, or
 * WhatsApp. Optimistic the same way.
 */
export function useSaveDineIn() {
  return useSessionSave<DineInMode>(
    saveDineIn,
    (user, mode) => withOrdering(user, { dine_in: mode }),
    refreshOrderViews,
  )
}

/**
 * Saves what a WhatsApp order asks the guest for, the whole set at once.
 * Optimistic the same way. The order pages read nothing of it, so they are
 * left alone.
 */
export function useSaveWhatsAppFields() {
  return useSessionSave<WhatsAppFieldsSettings>(saveWhatsAppFields, (user, fields) =>
    withOrdering(user, { whatsapp_fields: fields }),
  )
}
