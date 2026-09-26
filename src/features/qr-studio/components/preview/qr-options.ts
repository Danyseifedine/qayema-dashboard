import type { Options } from 'qr-code-styling'
import type { LogoSize, QrDesign } from '../../schemas/qr.schema'

/**
 * Turns a design into the options `qr-code-styling` draws from.
 *
 * Mirrors App\Services\Global\QrStyle::options() in ../qayema, which the
 * printable card is drawn from, so the preview here is the card on the table.
 * Both are tested against the same cases — change one, change both.
 */

/** How much of the code the logo covers, by the owner's size choice. */
export const LOGO_SHARE: Record<LogoSize, number> = { small: 0.25, medium: 0.35, large: 0.45 }

export function qrOptions(design: QrDesign, data: string, logo: string | null): Options {
  const withLogo = design.logo && logo !== null

  const options: Options = {
    data,
    margin: 0,
    // A logo covers modules, so the code needs more redundancy to still scan;
    // without one, M keeps the pattern less dense.
    qrOptions: { errorCorrectionLevel: withLogo ? 'H' : 'M' },
    dotsOptions: { type: design.dot_style, ...fill(design) },
    cornersSquareOptions: { type: design.corner_style, color: design.corner_color },
    cornersDotOptions: { type: design.eye_style, color: design.eye_color },
    backgroundOptions: { color: design.background },
  }

  if (withLogo) {
    options.image = logo
    options.imageOptions = {
      hideBackgroundDots: true,
      imageSize: LOGO_SHARE[design.logo_size],
      margin: 4,
    }
  }

  return options
}

function fill(design: QrDesign): Pick<NonNullable<Options['dotsOptions']>, 'color' | 'gradient'> {
  if (design.dot_gradient === null) return { color: design.dot_color }

  return {
    gradient: {
      type: design.gradient_type,
      // Corner to corner reads as intended; a radial gradient has no angle.
      rotation: design.gradient_type === 'linear' ? Math.PI / 4 : 0,
      colorStops: [
        { offset: 0, color: design.dot_color },
        { offset: 1, color: design.dot_gradient },
      ],
    },
  }
}

/* -------------------------------------------------------------------------
 | Will it scan?
 * ----------------------------------------------------------------------- */

/**
 * The contrast a colour needs against the background before we stop warning.
 *
 * 4.5:1, not the 3:1 first planned: decoding real renders showed red corner
 * centres (#EA4335, about 3.9:1 on white) stopped a reader finding the code,
 * while blue dots at 4.6:1 read fine. So every part is checked, not just the
 * dots — the corner centres are what a reader locks on to first.
 */
export const MIN_CONTRAST = 4.5

export type WeakPart = 'dots' | 'gradient' | 'corner frames' | 'corner centres'

/** The parts of the code too close in colour to the background to be safe. */
export function weakParts(design: QrDesign): WeakPart[] {
  const parts: [WeakPart, string | null][] = [
    ['dots', design.dot_color],
    ['gradient', design.dot_gradient],
    ['corner frames', design.corner_color],
    ['corner centres', design.eye_color],
  ]

  return parts
    .filter(([, colour]) => colour !== null && contrast(colour, design.background) < MIN_CONTRAST)
    .map(([part]) => part)
}

/** The WCAG contrast ratio between two hex colours, from 1 to 21. */
export function contrast(a: string, b: string): number {
  const first = luminance(a)
  const second = luminance(b)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
}
