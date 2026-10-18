import QRCodeStyling, { type Options } from 'qr-code-styling'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/utils/dom/cn'

/** The size the library draws at. The drawing is vector, so it fills any frame. */
const SIZE = 232

export type QrPreviewProps = {
  options: Options
  className?: string
}

/**
 * The live code, drawn by the same library the printable card uses. It sits in
 * a frame of its own background colour, which is also its quiet zone here,
 * and grows to the width it is given. The frame's edge is fixed: a padding in
 * percent is a share of the parent's width, which on a wide card left the
 * code a speck in the middle.
 */
export function QrPreview({ options, className }: QrPreviewProps) {
  const { t } = useTranslation('qr')
  const host = useRef<HTMLDivElement>(null)

  // A fresh drawing for every change. The library's update() merges into the
  // options it already has, so a gradient switched off or a logo removed (a
  // key that is simply absent now) would stay on the code.
  useEffect(() => {
    // Set by the time effects run: the frame is always drawn.
    const element = host.current!

    new QRCodeStyling({ ...options, width: SIZE, height: SIZE, type: 'svg' }).append(element)

    return () => element.replaceChildren()
  }, [options])

  return (
    <div
      className={cn('rounded-tile p-3.5', className)}
      style={{ background: options.backgroundOptions?.color ?? '#FFFFFF' }}
    >
      <div
        ref={host}
        role="img"
        aria-label={t('preview.label')}
        className="aspect-square w-full [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
      />
    </div>
  )
}
