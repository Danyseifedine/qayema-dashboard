import { z } from 'zod'

/**
 * The platforms the public menu can render an icon for. Mirrors
 * `RestaurantSocialLink::PLATFORMS` in ../qayema; adding one is a change in
 * both places plus a glyph in `components/platform`.
 */
export const SOCIAL_PLATFORMS = ['instagram', 'x', 'facebook', 'tiktok'] as const

export const platformSchema = z.enum(SOCIAL_PLATFORMS)

/** What each platform is called in the dashboard. */
export const PLATFORM_LABELS: Record<(typeof SOCIAL_PLATFORMS)[number], string> = {
  instagram: 'Instagram',
  x: 'X',
  facebook: 'Facebook',
  tiktok: 'TikTok',
}

/** Mirrors ../qayema/app/Http/Resources/SocialLinkResource.php. */
export const socialLinkSchema = z.object({
  id: z.number().int(),
  platform: platformSchema,
  url: z.url(),
})

export const socialLinkListSchema = z.object({
  data: z.array(socialLinkSchema),
  meta: z.object({
    used: z.number().int(),
    /** Null means unlimited on this package. */
    limit: z.number().int().nullable(),
  }),
})

export const socialLinkResponseSchema = z.object({ data: socialLinkSchema })

/**
 * The server accepts http and https only, because the URL is rendered as a
 * link on the public menu and a `javascript:` scheme must never reach it. The
 * form rejects the same thing up front rather than waiting for the 422.
 */
export const socialLinkFormSchema = z.object({
  platform: platformSchema,
  url: z
    .url('Enter the full link, starting with https://')
    .max(500, 'That link is too long.')
    .refine(
      (value) => value.startsWith('http://') || value.startsWith('https://'),
      'A link must start with http:// or https://',
    ),
})

export type SocialPlatform = z.infer<typeof platformSchema>
export type SocialLink = z.infer<typeof socialLinkSchema>
export type SocialLinkList = z.infer<typeof socialLinkListSchema>
export type SocialLinkFormValues = z.infer<typeof socialLinkFormSchema>
