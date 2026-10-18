import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandPinterest,
  IconBrandSnapchat,
  IconBrandTelegram,
  IconBrandThreads,
  IconBrandTiktok,
  IconBrandTripadvisor,
  IconBrandX,
  IconBrandYoutube,
  type IconProps,
  type TablerIcon,
} from '@tabler/icons-react'
import { cn } from '@/shared/utils/dom/cn'
import type { SocialPlatform } from '@/features/social-links/schemas/social-link.schema'

export type PlatformIconProps = IconProps & {
  platform: SocialPlatform
}

/** Each platform's mark, from Tabler's brand set: stroked like every other icon. */
const MARKS: Record<SocialPlatform, TablerIcon> = {
  instagram: IconBrandInstagram,
  x: IconBrandX,
  facebook: IconBrandFacebook,
  tiktok: IconBrandTiktok,
  youtube: IconBrandYoutube,
  snapchat: IconBrandSnapchat,
  threads: IconBrandThreads,
  telegram: IconBrandTelegram,
  pinterest: IconBrandPinterest,
  tripadvisor: IconBrandTripadvisor,
}

/** The mark for one platform, in the same stroked 24px style as the app's icons. */
export function PlatformIcon({ platform, className, ...props }: PlatformIconProps) {
  const Mark = MARKS[platform]
  return <Mark aria-hidden className={cn('size-5', className)} {...props} />
}
