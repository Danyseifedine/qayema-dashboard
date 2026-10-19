import { useId, type ReactNode } from 'react'
import { cn } from '@/shared/utils/dom/cn'

export type SectionCardProps = {
  /** Its mark beside the title, in gold: an icon at 18px, or a short sign (the fonts card's "Aa"). */
  icon: ReactNode
  title: ReactNode
  description?: ReactNode
  /** A wide photo of what the card holds, in its top corner behind the title. */
  picture?: string
  /**
   * The photo hangs past the card's edge, showing only its near half. Off for
   * a photo whose subject sits at its far edge (the account's coin and lock),
   * which would be cut away; it then fits inside the card.
   */
  bleed?: boolean
  /**
   * A smaller photo, whole and centred in the corner, for a card whose
   * controls start right under its title (Features) and a photo whose
   * subject stands in its middle, which past the edge would be cut away.
   * Kept inside the card, so with `bleed` off.
   */
  smallPicture?: boolean
  className?: string
  children?: ReactNode
}

/**
 * A part of a settings page on a glass card: a small gold mark beside its
 * name, as on the QR page's cards, a line on what it holds, then its
 * controls. A picture sits in the top corner on the
 * far side, partly past the edge so only its near half shows, fading out
 * toward the words and down into the card; in Arabic it moves to the other
 * corner, mirrored.
 */
export function SectionCard({
  icon,
  title,
  description,
  picture,
  bleed = true,
  smallPicture = false,
  className,
  children,
}: SectionCardProps) {
  const id = useId()

  return (
    <section
      aria-labelledby={id}
      className={cn(
        '@container relative isolate flex flex-col gap-4 overflow-hidden glass-card rounded-card p-3.5 sm:p-4',
        className,
      )}
    >
      {picture ? (
        <img
          src={picture}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          // Sized on the card: on a narrow one it starts where the words stop,
          // so they never sit on the photo.
          className={cn(
            'card-picture pointer-events-none absolute top-0 -z-10 object-cover rtl:-scale-x-100',
            smallPicture
              ? 'h-[100px] @min-[22rem]:h-[110px] @min-[40rem]:h-[104px]'
              : 'h-[120px] @min-[22rem]:h-[132px] @min-[40rem]:h-[156px]',
            bleed
              ? '-end-[16%] w-[56%] @min-[22rem]:-end-[14%] @min-[22rem]:w-[66%] @min-[40rem]:w-[50%]'
              : smallPicture
                ? 'card-picture-inside end-0 w-[40%] object-center @min-[22rem]:w-[42%] @min-[40rem]:w-[30%]'
                : // Cropped from the near side, so the subject at the far edge stays.
                  'card-picture-inside end-0 w-[50%] object-right @min-[22rem]:w-[56%] @min-[40rem]:w-[44%]',
          )}
        />
      ) : null}
      {/* The words stop where the photo begins: its share of the row is kept free. */}
      <div
        className={cn(
          picture &&
            (smallPicture
              ? 'pe-[38%] @min-[22rem]:pe-[40%] @min-[40rem]:pe-[30%]'
              : 'pe-[40%] @min-[22rem]:pe-[44%] @min-[40rem]:pe-[46%]'),
        )}
      >
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="flex shrink-0 text-accent">
            {icon}
          </span>
          <h2 id={id} className="min-w-0 font-display text-[20px] leading-tight">
            {title}
          </h2>
        </div>
        {description ? (
          <p className="mt-1 text-[12.5px] leading-snug text-[var(--muted)]">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}
