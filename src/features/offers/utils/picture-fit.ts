import type { OfferFormValues, Placement } from '@/features/offers/schemas/offer.schema'

/** Width over height of each shape the menu draws (as menu-classic.css). */
const SHAPE_RATIO = { rectangle: 2, square: 1, tall: 0.75 } as const
export type Shape = keyof typeof SHAPE_RATIO

/**
 * How far a picture's proportions may be from its shape's and still be
 * cropped to fill it; further off, the menu shows it whole on a blurred
 * copy of itself. A picture alone carries its own words, so it is barely
 * cropped at all. The twin of Offer::CROPS_UP_TO and
 * PICTURE_ALONE_CROPS_UP_TO in ../qayema (and fitPicture() in
 * menu-offers.js): change one, change all.
 */
const CROPS_UP_TO = 1.35
const PICTURE_ALONE_CROPS_UP_TO = 1.05

/** Below this a cropped picture loses little enough to say nothing. */
const TRIMS_UNNOTICED = 1.15

/** Under this many pixels on its longer side, a picture looks soft on a phone. */
const SHARP_FROM = 1000

/** The shape a placement shows in: a banner's and a pop-up's are picked, an ad is always a rectangle. */
export function shapeOf(
  placement: Placement,
  shapes: Pick<OfferFormValues, 'banner_shape' | 'popup_shape'>,
): Shape {
  return placement === 'banner'
    ? shapes.banner_shape
    : placement === 'popup'
      ? shapes.popup_shape
      : 'rectangle'
}

/** How far apart two proportions are, as a factor of 1 or more. */
function apart(a: number, b: number): number {
  return a > b ? a / b : b / a
}

/** The menu shows this picture whole in this shape (on its blurred copy) rather than cropped. */
export function showsWhole(ratio: number | null, shape: Shape, alone: boolean): boolean {
  return (
    ratio !== null &&
    apart(ratio, SHAPE_RATIO[shape]) > (alone ? PICTURE_ALONE_CROPS_UP_TO : CROPS_UP_TO)
  )
}

/**
 * What a shape does to a picture worth telling the owner: shown whole on a
 * blurred background, or trimmed at its edges; which way it overflows; and
 * the shape among `choices` that fits it best, when that is another one.
 * Null when it fits well enough or its size is unknown.
 */
export function pictureFit(
  ratio: number | null,
  shape: Shape,
  choices: readonly Shape[],
  alone = false,
): { mode: 'whole' | 'trimmed'; way: 'tall' | 'wide'; better: Shape | null } | null {
  if (ratio === null) return null
  const off = apart(ratio, SHAPE_RATIO[shape])
  const whole = showsWhole(ratio, shape, alone)
  if (!whole && off <= TRIMS_UNNOTICED) return null
  const best = [...choices].sort(
    (a, b) => apart(ratio, SHAPE_RATIO[a]) - apart(ratio, SHAPE_RATIO[b]),
  )[0]
  return {
    mode: whole ? 'whole' : 'trimmed',
    way: ratio < SHAPE_RATIO[shape] ? 'tall' : 'wide',
    better: best !== undefined && best !== shape ? best : null,
  }
}

/** A picture too small to look sharp across a phone. */
export function tooSmall(size: { width: number; height: number } | null): boolean {
  return size !== null && Math.max(size.width, size.height) < SHARP_FROM
}
