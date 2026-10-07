import QRCodeStyling, { type Options } from 'qr-code-styling'
import { useEffect, useRef } from 'react'

export type TableQrProps = {
  options: Options
  /** Drawn size in pixels; an SVG, so it stays sharp when printed larger. */
  size: number
  label: string
}

/**
 * A table's code, drawn by the same library and from the same design as the
 * QR page, so a table card matches the menu's own code.
 */
export function TableQr({ options, size, label }: TableQrProps) {
  const host = useRef<HTMLDivElement>(null)

  // Drawn afresh on every change: the library's update() merges, so a logo
  // taken off the design would otherwise stay on.
  useEffect(() => {
    const element = host.current
    if (!element) return

    new QRCodeStyling({ ...options, width: size, height: size, type: 'svg' }).append(element)

    return () => element.replaceChildren()
  }, [options, size])

  return (
    <div
      ref={host}
      role="img"
      aria-label={label}
      // Shrinks to fit a narrow card (a phone's two columns); an SVG stays sharp.
      style={{ width: size, maxWidth: '100%', aspectRatio: '1' }}
      className="[&>svg]:block [&>svg]:h-full [&>svg]:w-full"
    />
  )
}
