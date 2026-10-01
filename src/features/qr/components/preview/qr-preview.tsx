import QRCodeStyling, { type Options } from 'qr-code-styling'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

/** Rendered size in pixels. The download is drawn separately, larger. */
const SIZE = 232

export type QrPreviewProps = {
  options: Options
}

/**
 * The live code, drawn by the same library the printable card uses. It sits in
 * a frame of its own background colour, which is also its quiet zone here.
 */
export function QrPreview({ options }: QrPreviewProps) {
  const { t } = useTranslation('qr')
  const host = useRef<HTMLDivElement>(null)

  // A fresh drawing for every change. The library's update() merges into the
  // options it already has, so a gradient switched off or a logo removed (a
  // key that is simply absent now) would stay on the code.
  useEffect(() => {
    const element = host.current
    if (!element) return

    new QRCodeStyling({ ...options, width: SIZE, height: SIZE, type: 'svg' }).append(element)

    return () => element.replaceChildren()
  }, [options])

  return (
    <div
      className="inline-flex rounded-[18px] p-4"
      style={{ background: options.backgroundOptions?.color ?? '#FFFFFF' }}
    >
      <div
        ref={host}
        role="img"
        aria-label={t('preview.label')}
        style={{ width: SIZE, height: SIZE }}
        className="[&>svg]:block [&>svg]:h-full [&>svg]:w-full"
      />
    </div>
  )
}
