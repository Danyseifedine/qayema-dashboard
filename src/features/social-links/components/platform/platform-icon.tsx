import type { ComponentProps } from 'react'
import { cn } from '@/shared/utils/dom/cn'
import type { SocialPlatform } from '../../schemas/social-link.schema'

export type PlatformIconProps = ComponentProps<'svg'> & {
  platform: SocialPlatform
}

/**
 * The mark for one platform, drawn in the same stroked 24px style as every
 * other icon in the app so a row of them reads as one set.
 *
 * lucide dropped its brand icons, and a filled logo would sit oddly beside the
 * stroked ones, so these are simple glyphs that identify the destination of a
 * link rather than reproductions of the brands' artwork.
 */
export function PlatformIcon({ platform, className, ...props }: PlatformIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn('size-5', className)}
      {...props}
    >
      {GLYPHS[platform]}
    </svg>
  )
}

const GLYPHS: Record<SocialPlatform, React.ReactNode> = {
  // A camera: rounded frame, lens, flash dot.
  instagram: (
    <>
      <rect x="2.75" y="2.75" width="18.5" height="18.5" rx="5.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.25" cy="6.75" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  // Two crossing strokes, the way the wordmark reads.
  x: (
    <>
      <path d="M4 3.5 20 20.5" />
      <path d="M20 3.5 4 20.5" />
    </>
  ),
  // The lowercase f rising out of a rounded frame.
  facebook: (
    <>
      <rect x="2.75" y="2.75" width="18.5" height="18.5" rx="5.5" />
      <path d="M15 8h-1.5A2.5 2.5 0 0 0 11 10.5V21" />
      <path d="M8.75 13.5h5.5" />
    </>
  ),
  // A quaver: note head, stem, flag.
  tiktok: (
    <>
      <path d="M13 3v12.5a3.75 3.75 0 1 1-3.75-3.75c.34 0 .68.05 1 .14" />
      <path d="M13 3.25c.4 2.9 2.75 5.1 5.6 5.25" />
    </>
  ),
}
