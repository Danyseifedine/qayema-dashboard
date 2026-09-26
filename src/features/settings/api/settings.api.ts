import { request } from '@/lib/api'
import { settingsResponseSchema, type Settings } from '../schemas/settings.schema'

/**
 * What the owner may change about their restaurant. The slug is absent from
 * the payload on purpose: the public address is fixed at onboarding.
 */
export type SettingsPayload = {
  name: string
  description: string | null
  google_maps_url: string | null
  country_code: string | null
  phone: string
  currency: string
  timezone: string
  /** One range per weekday, null for a day the restaurant does not open. */
  opening_hours: Record<string, { open: string; close: string } | null>
  /** A temp-upload key, sent only when a new file was picked this session. */
  logo_key?: string
  cover_image_key?: string
  delete_cover_image?: boolean
}

export async function fetchSettings(signal?: AbortSignal): Promise<Settings> {
  const { data } = await request(settingsResponseSchema, {
    method: 'GET',
    url: '/api/settings',
    signal,
  })
  return data
}

export async function updateSettings(payload: SettingsPayload): Promise<Settings> {
  const { data } = await request(settingsResponseSchema, {
    method: 'PATCH',
    url: '/api/settings',
    data: payload,
  })
  return data
}
