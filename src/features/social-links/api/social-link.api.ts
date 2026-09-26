import { z } from 'zod'
import { request } from '@/lib/api'
import {
  socialLinkListSchema,
  socialLinkResponseSchema,
  type SocialLink,
  type SocialLinkFormValues,
  type SocialLinkList,
} from '../schemas/social-link.schema'

export function fetchSocialLinks(signal?: AbortSignal): Promise<SocialLinkList> {
  return request(socialLinkListSchema, { method: 'GET', url: '/api/social-links', signal })
}

export async function createSocialLink(payload: SocialLinkFormValues): Promise<SocialLink> {
  const { data } = await request(socialLinkResponseSchema, {
    method: 'POST',
    url: '/api/social-links',
    data: payload,
  })
  return data
}

/**
 * Both fields are required on update: the rules mark them `required`, not
 * `sometimes`, so sending one alone would fail validation.
 */
export async function updateSocialLink(
  id: number,
  payload: SocialLinkFormValues,
): Promise<SocialLink> {
  const { data } = await request(socialLinkResponseSchema, {
    method: 'PATCH',
    url: `/api/social-links/${id}`,
    data: payload,
  })
  return data
}

/** 204. */
export async function deleteSocialLink(id: number): Promise<void> {
  await request(z.unknown(), { method: 'DELETE', url: `/api/social-links/${id}` })
}
