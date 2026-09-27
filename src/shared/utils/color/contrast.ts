/**
 * The contrast two colours need before we stop warning: WCAG's 4.5:1 for body
 * text. The QR studio uses the same bar (see qr-options.ts for why).
 */
export const MIN_CONTRAST = 4.5

/** The WCAG contrast ratio between two `#RRGGBB` colours, from 1 to 21. */
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
