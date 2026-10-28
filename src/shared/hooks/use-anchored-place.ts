import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react'

/** The gap between the field and its panel. */
const GAP = 6

export type AnchoredPlaceOptions = {
  /** The widest the panel gets, to decide which side has room. */
  width: number
  /** Roughly the panel's height plus its offset, to decide which way to open. */
  height: number
  /** Grow from the field's end edge near the screen's side (else always from its start). */
  alignEnd: boolean
  /** At least as wide as the field. */
  matchWidth: boolean
}

/**
 * Where a panel that drops from a field (a list, a calendar) sits while
 * open: `fixed` at the field's place on screen, followed on scroll and
 * resize, so a scrolling parent such as a dialog's body cannot clip it.
 */
export function useAnchoredPlace(
  open: boolean,
  anchor: RefObject<HTMLElement | null>,
  options: AnchoredPlaceOptions,
): CSSProperties {
  const [place, setPlace] = useState<CSSProperties>({})
  const { width, height, alignEnd, matchWidth } = options

  useLayoutEffect(() => {
    if (!open) return
    const follow = () => setPlace(placeFor(anchor.current, { width, height, alignEnd, matchWidth }))
    follow()
    window.addEventListener('scroll', follow, true)
    window.addEventListener('resize', follow)
    return () => {
      window.removeEventListener('scroll', follow, true)
      window.removeEventListener('resize', follow)
    }
  }, [open, anchor, width, height, alignEnd, matchWidth])

  return place
}

/**
 * Where to draw such a panel: in the `<dialog>` the field sits in, which is
 * in the browser's top layer (anything on `<body>` would be painted behind
 * it), else on the page. Never inside the field's own card, where a
 * `backdrop-filter` or `transform` (a frosted tile) would make `fixed`
 * relative to the card and its overflow clip the panel away.
 */
export function floatingRoot(element: HTMLElement | null): HTMLElement {
  return element?.closest('dialog') ?? document.body
}

/**
 * Under the field (over it when there is not enough room below but more
 * above), from the field's start edge (from its end edge near the screen's
 * side), and at least as wide as the field when asked.
 */
function placeFor(element: HTMLElement | null, options: AnchoredPlaceOptions): CSSProperties {
  if (!element) return {}
  const rect = element.getBoundingClientRect()
  const rtl = getComputedStyle(element).direction === 'rtl'
  const fromEnd = options.alignEnd && shouldAlignEnd(rect, rtl, options.width)
  // In Arabic the start edge is the right one.
  const fromLeft = rtl ? fromEnd : !fromEnd
  const below = window.innerHeight - rect.bottom
  const flipUp = below < options.height && rect.top > below

  return {
    ...(flipUp ? { bottom: window.innerHeight - rect.top + GAP } : { top: rect.bottom + GAP }),
    ...(fromLeft ? { left: rect.left } : { right: window.innerWidth - rect.right }),
    ...(options.matchWidth ? { minWidth: rect.width } : {}),
  }
}

/** Grow toward the start edge when there is not enough room toward the end. */
function shouldAlignEnd(rect: DOMRect, rtl: boolean, width: number): boolean {
  const towardEnd = rtl ? rect.right : window.innerWidth - rect.left
  return towardEnd < Math.min(width, window.innerWidth - 32)
}
