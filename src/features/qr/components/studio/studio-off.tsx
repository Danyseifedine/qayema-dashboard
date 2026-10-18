import { IconLock, IconQrcode } from '@tabler/icons-react'
import { Trans, useTranslation } from 'react-i18next'
import { GoldNotice } from '@/shared/components/feedback'

/**
 * The QR page while the owner has switched QR Studio off on the Features
 * page (their own switch, not the package): the plain code still works, and
 * one button leads back to the switch.
 */
export function StudioOff({ onOpenFeatures }: { onOpenFeatures: () => void }) {
  const { t } = useTranslation('qr')

  return (
    <GoldNotice
      icon={IconQrcode}
      badge={IconLock}
      title={
        <Trans
          t={t}
          i18nKey="page.offTitle"
          components={{ gold: <span className="text-accent" /> }}
        />
      }
      description={t('page.offDescription')}
      action={t('page.openFeatures')}
      onAction={onOpenFeatures}
      note={t('page.simpleMode')}
    />
  )
}
