import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { sessionKeys } from '@/features/auth'
import { categoryKeys, dishKeys } from '@/features/menu'
import { restaurantKeys } from '@/features/restaurant/hooks/restaurant-keys'
import {
  fetchPosConnection,
  linkPos,
  setPosSendsOrders,
  syncPos,
  unlinkPos,
  type PosConnection,
} from '@/features/restaurant/api/pos-connection.api'
import { t } from '@/lib/i18n'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'

/** How long a pull is waited for, and how often the link is asked about meanwhile. */
export const POS_WATCH_MS = 30_000
export const POS_POLL_MS = 3_000

/** What a pull changes on the link, read before it starts. */
type Mark = Pick<PosConnection, 'last_synced_at' | 'last_attempt_at' | 'last_error'>

const NOTHING_YET: Mark = { last_synced_at: null, last_attempt_at: null, last_error: null }

/**
 * Whether the pull started after `before` has finished: it synced, or it
 * tried and failed with a new error. Compared with what the server said
 * before, never with this device's clock.
 */
export function pullFinished(now: PosConnection | null | undefined, before: Mark): boolean {
  if (!now) return false
  if (now.last_synced_at !== before.last_synced_at) return true

  return (
    now.last_attempt_at !== before.last_attempt_at &&
    now.last_error !== null &&
    now.last_error !== before.last_error
  )
}

/** The menu, its counts and `pos_connected` come back from the server. */
function refreshMenu(queryClient: QueryClient) {
  for (const key of [sessionKeys.current(), categoryKeys.all, dishKeys.all]) {
    void queryClient.invalidateQueries({ queryKey: key })
  }
}

/**
 * Connect to POS on the Features page: the link as the server has it, and
 * linking, "Sync now" and disconnecting. A pull runs on the server just
 * after linking or "Sync now", so the link is asked about every few seconds
 * until it says the pull is done (or half a minute passed); the menu's
 * lists are then fetched again.
 */
export function usePosConnection() {
  const queryClient = useQueryClient()
  // What the link said when a pull began; null while none is waited for.
  const [waiting, setWaiting] = useState<Mark | null>(null)

  const query = useQuery<PosConnection | null, ApiError>({
    queryKey: restaurantKeys.posConnection(),
    queryFn: ({ signal }) => fetchPosConnection(signal),
    refetchInterval: (current) =>
      waiting !== null && !pullFinished(current.state.data, waiting) ? POS_POLL_MS : false,
  })

  const finished = waiting !== null && pullFinished(query.data, waiting)

  useEffect(() => {
    if (!finished) return
    setWaiting(null)
    refreshMenu(queryClient)
  }, [finished, queryClient])

  // Given up after a while: the pull may be queued behind others.
  useEffect(() => {
    if (waiting === null) return
    const timer = window.setTimeout(() => {
      setWaiting(null)
      refreshMenu(queryClient)
    }, POS_WATCH_MS)
    return () => window.clearTimeout(timer)
  }, [waiting, queryClient])

  const wait = useCallback((before: Mark) => setWaiting(before), [])

  const link = useMutation<PosConnection, ApiError, { address: string; key: string }>({
    mutationFn: linkPos,
    onSuccess: (connection) => {
      queryClient.setQueryData(restaurantKeys.posConnection(), connection)
      // `pos_connected` turns on now: the menu pages lock at once.
      void queryClient.invalidateQueries({ queryKey: sessionKeys.current() })
      wait(NOTHING_YET)
      toast.success(t('features:pos.linked'), t('features:pos.linkedDetail'))
    },
    onError: (error) => toast.error(t('features:pos.linkFailed'), error),
  })

  const sync = useMutation<void, ApiError, void>({
    mutationFn: syncPos,
    onSuccess: () => {
      const now = queryClient.getQueryData<PosConnection | null>(restaurantKeys.posConnection())
      wait(
        now
          ? {
              last_synced_at: now.last_synced_at,
              last_attempt_at: now.last_attempt_at,
              last_error: now.last_error,
            }
          : NOTHING_YET,
      )
      void queryClient.invalidateQueries({ queryKey: restaurantKeys.posConnection() })
      toast.success(t('features:pos.syncing'))
    },
    onError: (error) => toast.error(t('features:pos.syncFailed'), error),
  })

  const unlink = useMutation<void, ApiError, void>({
    mutationFn: unlinkPos,
    onSuccess: () => {
      setWaiting(null)
      queryClient.setQueryData(restaurantKeys.posConnection(), null)
      refreshMenu(queryClient)
      toast.success(t('features:pos.unlinked'), t('features:pos.unlinkedDetail'))
    },
    onError: (error) => toast.error(t('features:pos.unlinkFailed'), error),
  })

  // Shown switched at once, put back when the server refuses.
  const sendOrders = useMutation<
    PosConnection,
    ApiError,
    boolean,
    { before: PosConnection | null | undefined }
  >({
    mutationFn: setPosSendsOrders,
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: restaurantKeys.posConnection() })
      const before = queryClient.getQueryData<PosConnection | null>(restaurantKeys.posConnection())
      if (before) {
        queryClient.setQueryData(restaurantKeys.posConnection(), { ...before, sends_orders: next })
      }
      return { before }
    },
    onSuccess: (connection) => {
      queryClient.setQueryData(restaurantKeys.posConnection(), connection)
      toast.success(t(connection.sends_orders ? 'features:pos.ordersOn' : 'features:pos.ordersOff'))
    },
    onError: (error, _next, context) => {
      queryClient.setQueryData(restaurantKeys.posConnection(), context?.before ?? null)
      toast.error(t('features:pos.ordersFailed'), error)
    },
  })

  return { query, syncing: waiting !== null, link, sync, unlink, sendOrders }
}
