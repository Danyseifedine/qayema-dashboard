import { z } from 'zod'

/**
 * Environment contract, checked once at boot.
 *
 * A missing or malformed value fails here, loudly, in development, rather than
 * surfacing later as a broken request against `undefined/api/user`.
 */
const schema = z.object({
  /** Laravel API origin, no trailing slash, e.g. https://qayema.test */
  VITE_API_URL: z
    .url('VITE_API_URL must be an absolute URL, e.g. https://qayema.test')
    .transform((value) => value.replace(/\/+$/, '')),

  /** Where to send a visitor with no session. */
  VITE_LOGIN_URL: z.url('VITE_LOGIN_URL must be an absolute URL'),

  /**
   * Pusher's public key and cluster, for live orders. Left empty, the
   * dashboard checks for orders once a minute instead.
   */
  VITE_PUSHER_KEY: z
    .string()
    .optional()
    .transform((value) => value || undefined),
  VITE_PUSHER_CLUSTER: z.string().optional().default('eu'),
})

const parsed = schema.safeParse(import.meta.env)

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
    .join('\n')
  throw new Error(`Invalid environment configuration:\n${details}`)
}

export const env = parsed.data
