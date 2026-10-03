import type Echo from 'laravel-echo'
import type { ChannelAuthorizationData } from 'pusher-js/types/src/core/auth/options'
import { env } from '@/config/env'
import { api } from '@/lib/api/client'

let echo: Promise<Echo<'pusher'> | null> | undefined

/**
 * The live connection to Pusher, made once, on first use. Null when the
 * dashboard has no Pusher key: whoever asked then checks on a timer.
 *
 * Echo and Pusher's library load only here, so an owner whose orders go to
 * WhatsApp never downloads them. A private channel is signed by the app
 * (`POST /api/broadcasting/auth`) through the same axios client as every
 * other call, so the Sanctum session and the CSRF token go along.
 */
export function realtime(): Promise<Echo<'pusher'> | null> {
  if (echo) return echo
  const key = env.VITE_PUSHER_KEY
  if (!key) return (echo = Promise.resolve(null))

  echo = Promise.all([import('laravel-echo'), import('pusher-js')]).then(
    ([{ default: Echo }, { default: Pusher }]) =>
      new Echo({
        broadcaster: 'pusher',
        key,
        cluster: env.VITE_PUSHER_CLUSTER,
        forceTLS: true,
        Pusher,
        channelAuthorization: {
          transport: 'ajax',
          endpoint: '/api/broadcasting/auth',
          customHandler: ({ socketId, channelName }, callback) => {
            api
              .post<ChannelAuthorizationData>('/api/broadcasting/auth', {
                socket_id: socketId,
                channel_name: channelName,
              })
              .then((response) => callback(null, response.data))
              .catch((error: Error) => callback(error, null))
          },
        },
      }),
    // A network that cannot fetch the library: checked on a timer instead,
    // and asked again on the next try rather than remembered as off.
    () => {
      echo = undefined
      return null
    },
  )

  return echo
}
