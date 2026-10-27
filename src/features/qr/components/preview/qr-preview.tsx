import type { Options } from 'qr-code-styling'
import { useTranslation } from 'react-i18next'
import { QrCode } from '@/features/qr/components/preview/qr-code'
import { cn } from '@/shared/utils/dom/cn'

/** The size the library draws at. The drawing is vector, so it fills any frame. */
const SIZE = 232

export type QrPreviewProps = {
  options: Options
  className?: string
}

/**
 * The live code. It sits in a frame of its own background colour, which is
 * also its quiet zone here, and grows to the width it is given. The frame's
 * edge is fixed: a padding in percent is a share of the parent's width, which
 * on a wide card left the code a speck in the middle.
 */
export function QrPreview({ options, className }: QrPreviewProps) {
  const { t } = useTranslation('qr')

  return (
    <div
      className={cn('rounded-tile p-3.5', className)}
      style={{ background: options.backgroundOptions?.color ?? '#FFFFFF' }}
    >
      <QrCode options={options} size={SIZE} label={t('preview.label')} className="w-full" />
    </div>
  )
}
