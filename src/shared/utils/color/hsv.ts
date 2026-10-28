/** A colour as hue (0 to 360), saturation and brightness (0 to 1), the colour picker's axes. */
export type Hsv = { h: number; s: number; v: number }

/** "#RRGGBB" as hue, saturation and brightness. */
export function hexToHsv(hex: string): Hsv {
  const [r, g, b] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255) as [
    number,
    number,
    number,
  ]
  const max = Math.max(r, g, b)
  const range = max - Math.min(r, g, b)
  let h = 0
  if (range > 0) {
    if (max === r) h = ((g - b) / range + 6) % 6
    else if (max === g) h = (b - r) / range + 2
    else h = (r - g) / range + 4
  }
  return { h: h * 60, s: max === 0 ? 0 : range / max, v: max }
}

/** Hue, saturation and brightness as "#RRGGBB", in capitals like the dashboard stores it. */
export function hsvToHex({ h, s, v }: Hsv): string {
  const channel = (n: number) => {
    const k = (n + h / 60) % 6
    const value = v - v * s * Math.max(0, Math.min(k, 4 - k, 1))
    return Math.round(value * 255)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${channel(5)}${channel(3)}${channel(1)}`.toUpperCase()
}
