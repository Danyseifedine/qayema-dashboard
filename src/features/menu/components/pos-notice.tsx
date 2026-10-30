import { useTranslation } from 'react-i18next'
import { StatusChip } from '@/shared/components/data-display'
import { Alert } from '@/shared/components/ui'

/** Above the menu pages while the menu comes from a POS. */
export function PosBanner() {
  const { t } = useTranslation('menu')

  return <Alert variant="info">{t('pos.banner')}</Alert>
}

export type PosRowChipProps = {
  /** Made by the POS. */
  fromPos: boolean
  /** Gone from the POS since: hidden on the menu. */
  removed: boolean
}

/**
 * Why a row is not on the menu while it comes from a POS: gone from the POS,
 * or one the owner made before the link (hidden until they disconnect).
 * Nothing for a row the POS sends.
 */
export function PosRowChip({ fromPos, removed }: PosRowChipProps) {
  const { t } = useTranslation('menu')

  if (fromPos && !removed) return null

  return <StatusChip tone="faded">{removed ? t('pos.removed') : t('pos.hidden')}</StatusChip>
}
