import QRCodeStyling, { type Options } from 'qr-code-styling'
import { useEffect, useRef } from 'react'
import { cn } from '@/shared/utils/dom/cn'

export type QrPreviewProps = {
  options: Options
  /** Rendered size in pixels. The download is drawn separately, larger. */
  size?: number
  className?: string
}

/**
 * The live code, drawn by the same library the printable card uses. It sits in
 * a frame of its own background colour, which is also its quiet zone here.
 */
export function QrPreview({ options, size = 232, className }: QrPreviewProps) {
  const host = useRef<HTMLDivElement>(null)
  const code = useRef<QRCodeStyling | null>(null)

  useEffect(() => {
    const drawn = { ...options, width: size, height: size, type: 'svg' as const }

    if (code.current === null) {
      code.current = new QRCodeStyling(drawn)
      if (host.current) code.current.append(host.current)
      return
    }

    code.current.update(drawn)
  }, [options, size])

  // Let a remount start clean rather than stack a second drawing.
  useEffect(() => {
    const element = host.current
    return () => {
      element?.replaceChildren()
      code.current = null
    }
  }, [])

  return (
    <div
      className={cn('inline-flex rounded-[18px] p-4', className)}
      style={{ background: options.backgroundOptions?.color ?? '#FFFFFF' }}
    >
      <div
        ref={host}
        role="img"
        aria-label="Your menu's QR code"
        style={{ width: size, height: size }}
        className="[&>svg]:block [&>svg]:h-full [&>svg]:w-full"
      />
    </div>
  )
}
