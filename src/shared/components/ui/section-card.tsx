import { useId, type ReactNode } from 'react'
import { cn } from '@/shared/utils/dom/cn'

export type SectionCardProps = {
  /** Its mark beside the title, in gold: an icon at 18px, or a short sign (the fonts card's "Aa"). None for a group of fields in a form. */
  icon?: ReactNode
  /** A small control at the end of the title row, e.g. a close button. */
  action?: ReactNode
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
  /**
   * `caps` makes the title a small spaced label in capitals, with the
   * description at the row's end on a wider screen (the QR page's cards).
   * Such a card carries no picture.
   */
  heading?: 'title' | 'caps'
  className?: string
  children?: ReactNode
}

/**
 * A part of a settings page on a glass card: a small gold mark beside its
 * name, a line on what it holds, then its controls. A picture sits in the top corner on the
 * far side, partly past the edge so only its near half shows, fading out
 * toward the words and down into the card; in Arabic it moves to the other
 * corner, mirrored.
 */
export function SectionCard({
  icon,
  action,
  title,
  description,
  picture,
  bleed = true,
  smallPicture = false,
  heading = 'title',
  className,
  children,
}: SectionCardProps) {
  const id = useId()
  const mark = icon ? (
    <span aria-hidden className="flex shrink-0 text-accent">
      {icon}
    </span>
  ) : null

  return (
    <section
      aria-labelledby={id}
      className={cn(
        'flex flex-col glass-card rounded-card p-3.5 sm:p-4',
        // Room for the picture: a container for its sizes, and its overflow cut.
        heading === 'caps' ? 'gap-3 sm:gap-4' : '@container relative isolate gap-4 overflow-hidden',
        // The card is a layer of its own (isolate), so a list or menu opened
        // in it would sit under the next card: while one is open, the card
        // rises above its neighbours.
        'has-[[aria-expanded=true]]:z-30',
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
      {heading === 'caps' ? (
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          {mark}
          <h3
            id={id}
            className="font-sans text-[11px] font-medium tracking-[0.2em] text-[var(--text)] uppercase sm:text-[12px]"
          >
            {title}
          </h3>
          {description ? (
            <p className="basis-full text-[11.5px] leading-snug text-[var(--muted)] sm:ms-auto sm:basis-auto sm:text-end sm:text-[12.5px]">
              {description}
            </p>
          ) : null}
        </div>
      ) : (
        // The words stop where the photo begins: its share of the row is kept free.
        <div
          className={cn(
            picture &&
              (smallPicture
                ? 'pe-[38%] @min-[22rem]:pe-[40%] @min-[40rem]:pe-[30%]'
                : 'pe-[40%] @min-[22rem]:pe-[44%] @min-[40rem]:pe-[46%]'),
          )}
        >
          <div className="flex items-center gap-2.5">
            {mark}
            <h2 id={id} className="min-w-0 flex-1 font-display text-[20px] leading-tight">
              {title}
            </h2>
            {action}
          </div>
          {description ? (
            <p className="mt-1 text-[12.5px] leading-snug text-[var(--muted)]">{description}</p>
          ) : null}
        </div>
      )}
      {children}
    </section>
  )
}
