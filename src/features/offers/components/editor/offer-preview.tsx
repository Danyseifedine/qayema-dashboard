import { IconPhoto } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/utils/dom/cn'
import type { OfferLook } from '@/features/offers/hooks/use-offer-look'
import { ratioOf } from '@/features/offers/hooks/use-picture-size'
import type { OfferFormValues, Placement } from '@/features/offers/schemas/offer.schema'
import { shapeOf, showsWhole } from '@/features/offers/utils/picture-fit'

/** A card's shape on the menu: a banner's, a pop-up's or (always a rectangle) an ad's. */
export type CardShape = 'rectangle' | 'square' | 'tall'

const RATIO: Record<CardShape, string> = {
  rectangle: 'aspect-[2/1]',
  square: 'aspect-square',
  tall: 'aspect-[3/4]',
}

/**
 * The offer as a card in one shape, as the menu draws a banner, a pop-up or
 * an ad: the picture fills it (or, far from the shape's proportions, shows
 * whole on a blurred copy of itself), the words sit over its foot on a dark
 * fade (on the brand's gold without a picture). Never the discount: the
 * menu shows it on the dishes. A picture alone is only its picture.
 */
export function OfferPreview({
  look,
  shape,
  size = 'full',
  className,
}: {
  look: OfferLook
  shape: CardShape
  size?: 'mini' | 'full'
  className?: string
}) {
  const { t } = useTranslation('offers')
  const mini = size === 'mini'
  const words = look.showText
  const whole = showsWhole(ratioOf(look.pictureSize), shape, !words)

  return (
    <div
      aria-hidden
      className={cn(
        'relative overflow-hidden',
        RATIO[shape],
        mini ? 'rounded-tile' : 'rounded-card',
        look.imageUrl
          ? 'bg-[var(--hover-wash)]'
          : words
            ? 'bg-gradient-to-br from-gold to-gold-deep text-ink'
            : 'inset-tile',
        className,
      )}
    >
      {look.imageUrl ? (
        <>
          {whole ? (
            <img
              src={look.imageUrl}
              alt=""
              className="absolute -inset-[10%] size-[120%] object-cover blur-xl saturate-[1.15]"
            />
          ) : null}
          <img
            src={look.imageUrl}
            alt=""
            className={cn('absolute inset-0 size-full', whole ? 'object-contain' : 'object-cover')}
          />
        </>
      ) : words ? null : (
        <IconPhoto className="absolute inset-0 m-auto size-6 text-[var(--muted)]" stroke={1.5} />
      )}
      {look.imageUrl && words ? (
        <span className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black/85" />
      ) : null}
      {words ? (
        <span
          className={cn(
            'absolute inset-x-0 bottom-0 flex flex-col',
            mini ? 'gap-0 p-1.5' : 'gap-0.5 p-3',
            look.imageUrl && 'text-white',
          )}
        >
          <span
            dir="auto"
            className={cn(
              'line-clamp-2 leading-tight font-semibold [overflow-wrap:anywhere]',
              mini ? 'text-[10px]' : 'text-[15px]',
            )}
          >
            {look.title || t('card.untitled')}
          </span>
          {!mini && look.text ? (
            <span
              dir="auto"
              className="line-clamp-1 text-[12px] opacity-85 [overflow-wrap:anywhere]"
            >
              {look.text}
            </span>
          ) : null}
        </span>
      ) : null}
    </div>
  )
}

/** How wide a preview may grow, so a square or tall one stays a sensible size. */
const MAX_WIDTH: Record<CardShape, string> = {
  rectangle: 'max-w-[420px]',
  square: 'max-w-[240px]',
  tall: 'max-w-[210px]',
}

/**
 * The offer drawn in one place it shows, in that place's shape, named
 * under it: the live preview's and the review's.
 */
export function PreviewFigure({
  look,
  placement,
  shapes,
  caption,
}: {
  look: OfferLook
  placement: Placement
  shapes: Pick<OfferFormValues, 'banner_shape' | 'popup_shape'>
  caption: string
}) {
  const shape = shapeOf(placement, shapes)

  return (
    <figure className="flex min-w-0 flex-col gap-1.5">
      <OfferPreview look={look} shape={shape} className={cn('w-full', MAX_WIDTH[shape])} />
      <figcaption className="text-[12px] text-[var(--muted)]">{caption}</figcaption>
    </figure>
  )
}
