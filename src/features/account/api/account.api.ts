import { request } from '@/lib/api'
import { userResponseSchema, type AuthUser } from '@/features/auth/schemas/user.schema'
import { passwordResponseSchema } from '../schemas/account.schema'

/** The email is not here on purpose: accounts come from Google, so it is the identity. */
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

export async function updatePassword(payload: PasswordPayload): Promise<{ has_password: boolean }> {
  return request(passwordResponseSchema, {
    method: 'PUT',
    url: '/api/password',
    data: payload,
  })
}
