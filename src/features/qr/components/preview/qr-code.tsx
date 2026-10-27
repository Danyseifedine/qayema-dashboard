import QRCodeStyling, { type Options } from 'qr-code-styling'
import { useEffect, useRef } from 'react'
import { cn } from '@/shared/utils/dom/cn'

export type QrCodeProps = {
  options: Options
  /** Drawn size in pixels; an SVG, so it stays sharp at any size it is shown. */
  size: number
  label: string
  /** Its width: a square, at whatever width it is given. */
  className?: string
}

/**
 * A QR code, drawn by the same library the printable card uses: the QR
 * page's preview and every table's code.
 */
export function QrCode({ options, size, label, className }: QrCodeProps) {
  const host = useRef<HTMLDivElement>(null)

  // A fresh drawing for every change. The library's update() merges into the
  // options it already has, so a gradient switched off or a logo removed (a
  // key that is simply absent now) would stay on the code.
  useEffect(() => {
    // Set by the time effects run: the host is always drawn.
    const element = host.current!

    new QRCodeStyling({ ...options, width: size, height: size, type: 'svg' }).append(element)

    return () => element.replaceChildren()
  }, [options, size])

  return (
    <div
      ref={host}
      role="img"
      aria-label={label}
      className={cn('aspect-square [&>svg]:block [&>svg]:h-full [&>svg]:w-full', className)}
    />
  )
}
