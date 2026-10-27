import { IconCrown, IconQrcode } from '@tabler/icons-react'
import { Trans, useTranslation } from 'react-i18next'
import { useTurnedOff } from '@/features/auth'
import { TurnedOffNotice, usePackageFor } from '@/features/package'
import { GoldNotice } from '@/shared/components/feedback'
import type { Locale } from '@/shared/constants/locales'

type StudioLockedProps = {
  locale: Locale
  onOpenPackage: () => void
}

/**
 * The studio on a package without it: the plain code works, this is what it
 * would add and the package that has it, in the same notice as the studio
 * switched off. Turned off by an admin, it says so instead.
 */
export function StudioLocked({ locale, onOpenPackage }: StudioLockedProps) {
  const { t } = useTranslation('qr')
  const unlockedBy = usePackageFor('qr_studio', locale)
  const turnedOff = useTurnedOff('qr_studio')

  if (turnedOff) return <TurnedOffNotice flag="qr_studio" locale={locale} />

  return (
    <GoldNotice
      icon={IconQrcode}
      badge={IconCrown}
      title={
        <Trans
          t={t}
          i18nKey={unlockedBy ? 'page.lockedTitle' : 'page.lockedTitleNoPackage'}
          values={{ package: unlockedBy }}
          components={{ gold: <span className="text-accent" /> }}
        />
      }
      description={t('page.lockedDescription')}
      action={t('page.seePackages')}
      onAction={onOpenPackage}
      note={t('page.simpleMode')}
    />
  )
}
