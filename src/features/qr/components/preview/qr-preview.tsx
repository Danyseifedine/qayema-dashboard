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
  const code = useRef<QRCodeStyling | null>(null)

  useEffect(() => {
    const drawn = { ...options, width: SIZE, height: SIZE, type: 'svg' as const }

    if (code.current === null) {
      code.current = new QRCodeStyling(drawn)
      if (host.current) code.current.append(host.current)
      return
    }

    code.current.update(drawn)
  }, [options])

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
