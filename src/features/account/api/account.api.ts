import { z } from 'zod'
import { request } from '@/lib/api'
import { userResponseSchema, type AuthUser } from '@/features/auth'

/** The email and the username are not here on purpose: each is how the account signs in. */
export async function updateProfile(name: string): Promise<AuthUser> {
  const { data } = await request(userResponseSchema, {
    method: 'PATCH',
    url: '/api/account',
    data: { name },
  })
  return data
}

export type PasswordPayload = {
  /** Omitted by an account that has never had a password. */
  current_password?: string
  password: string
  password_confirmation: string
}

export async function updatePassword(payload: PasswordPayload): Promise<void> {
  await request(z.unknown(), { method: 'PUT', url: '/api/password', data: payload })
}
