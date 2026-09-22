import { z } from 'zod'
import { request } from '@/lib/api'
import { userResponseSchema, type AuthUser } from '../schemas/user.schema'

/** GET /api/user — the signed-in owner, their restaurant, limits and features. */
export async function fetchSession(signal?: AbortSignal): Promise<AuthUser> {
  const { data } = await request(userResponseSchema, {
    method: 'GET',
    url: '/api/user',
    signal,
  })

  return data
}

/** POST /api/logout — destroys the session server-side. */
export async function logout(): Promise<void> {
  await request(z.unknown(), { method: 'POST', url: '/api/logout' })
}
