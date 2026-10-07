import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { t } from '@/lib/i18n'
import { realtime } from '@/lib/realtime/echo'
import { toast } from '@/shared/components/feedback'
import { fetchOrderPulse } from '@/features/orders/api/order.api'
import { orderKeys } from '@/features/orders/hooks/order-keys'
import { orderPulseSchema } from '@/features/orders/schemas/order.schema'
import { playNewOrderSound } from '@/features/orders/utils/new-order-sound'

/** How often to ask while Pusher cannot be heard (no key, network, limit). */
export const FALLBACK_INTERVAL = 60_000

/**
 * Watches for new orders placed in the menu, and for guests changing one,
 * wherever the owner is in the dashboard. Pusher says so the moment it
 * happens (`orders.changed` on the restaurant's private channel); while it
 * cannot be heard, the dashboard asks once a minute instead. Either way a
 * new or changed order plays the chime, says so in a toast and refreshes
 * the Orders page, and the number still waiting goes into the tab's title,
 * so a dashboard left in a background tab still shows it.
 *
 * Off (`enabled` false) while nothing is ordered in the menu: orders going
 * to WhatsApp never arrive here, while orders at the table always do.
 * Returns how many wait on each page.
 */
export function useOrderPulse(enabled: boolean, restaurantId: number): OrdersWaiting {
  const queryClient = useQueryClient()
  const [live, setLive] = useState(false)

  const pulse = useQuery({
    queryKey: orderKeys.pulse(),
    queryFn: ({ signal }) => fetchOrderPulse(signal),
    enabled,
    refetchInterval: live ? false : FALLBACK_INTERVAL,
    // A background tab is exactly where an owner leaves the dashboard.
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  })

  useEffect(() => {
    if (!enabled) return

    // Pusher's library arrives after a moment; left before it did, or
    // switched off meanwhile, nothing is listened to.
    let stop: (() => void) | undefined
    let gone = false

    void realtime().then((echo) => {
      if (!echo || gone) return

      const name = `orders.${restaurantId}`
      echo
        .private(name)
        .listen('.orders.changed', (next: unknown) => {
          // Checked like any answer from the API; one that does not fit is
          // asked for again instead.
          const heard = orderPulseSchema.shape.data.safeParse(next)
          if (heard.success) queryClient.setQueryData(orderKeys.pulse(), heard.data)
          else void queryClient.invalidateQueries({ queryKey: orderKeys.pulse() })
          // A status moved in another tab changes no count worth a chime, but
          // the list still has to show it.
          void queryClient.invalidateQueries({ queryKey: orderKeys.lists() })
        })
        // Heard only once the channel is joined: a sign-in the app refuses
        // (an expired session) leaves Pusher connected but deaf, and the
        // minute's check has to carry on.
        .subscribed(() => setLive(true))
        .error(() => setLive(false))

      const connection = echo.connector.pusher.connection
      const onState = ({ current }: { current: string }) => {
        if (current !== 'connected') setLive(false)
        // Back after a gap: whatever happened meanwhile was not heard.
        else void queryClient.invalidateQueries({ queryKey: orderKeys.pulse() })
      }
      connection.bind('state_change', onState)

      stop = () => {
        connection.unbind('state_change', onState)
        echo.leave(name)
      }
    })

    return () => {
      gone = true
      stop?.()
      setLive(false)
    }
  }, [enabled, restaurantId, queryClient])

  // The newest id and the last change seen so far. Undefined until the
  // first answer, which only sets them: what was already there when the
  // dashboard opened is not news.
  const seen = useRef<{ latest: number | null; changed: string | null } | undefined>(undefined)
  const latest = enabled ? pulse.data?.latest : undefined
  const changed = enabled ? pulse.data?.changed : undefined

  useEffect(() => {
    if (latest === undefined || changed === undefined) return

    const before = seen.current
    seen.current = { latest, changed }
    if (before === undefined) return

    const arrived = latest !== null && (before.latest === null || latest > before.latest)
    const edited = changed !== null && changed !== before.changed

    if (!arrived && !edited) return

    playNewOrderSound()
    if (arrived) {
      toast.info(t('orders:alert.title'), t('orders:alert.description'))
    } else {
      toast.info(t('orders:alert.changedTitle'), t('orders:alert.changedDescription'))
    }
    void queryClient.invalidateQueries({ queryKey: orderKeys.lists() })
  }, [latest, changed, queryClient])

  const open = enabled ? (pulse.data?.open ?? 0) : 0
  const atTables = enabled ? (pulse.data?.table_open ?? 0) : 0
  const waiting = open + atTables

  useEffect(() => {
    const plain = () => document.title.replace(/^\(\d+\) /, '')
    const title = plain()
    document.title = waiting > 0 ? `(${waiting}) ${title}` : title
    // Signed out, or orders moved to WhatsApp: the count leaves with it.
    return () => {
      document.title = plain()
    }
  }, [waiting])

  return { orders: open, tables: atTables }
}

/** Orders waiting to be accepted: on the Orders page, and on Table orders. */
export type OrdersWaiting = { orders: number; tables: number }
