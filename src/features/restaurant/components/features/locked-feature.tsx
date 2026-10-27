import { IconChevronRight, IconCrown, IconLock } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useTurnedOff } from '@/features/auth'
import { usePackageFor, type PackageFlag } from '@/features/package'
import { usePreferencesStore } from '@/stores/preferences.store'

type LockedFeatureProps = { flag: PackageFlag; onOpenPackage: () => void }

/**
 * Under a feature the package lacks, in place of a switch that could not be
 * used: the package it comes with on a soft gold strip, and the way to the
 * Package page. One an admin turned off for this restaurant says so on a
 * quiet strip and leads nowhere: no package would bring it back.
 */
export function LockedFeature({ flag, onOpenPackage }: LockedFeatureProps) {
  const { t } = useTranslation('features')
  const locale = usePreferencesStore((state) => state.locale)
  const name = usePackageFor(flag, locale)
  const turnedOff = useTurnedOff(flag)

  if (turnedOff) {
    return (
      <p className="mt-2.5 flex items-start gap-2 rounded-tile bg-[var(--hover-wash)] px-3 py-2.5 text-[12.5px] leading-snug text-[var(--muted)]">
        <IconLock aria-hidden className="mt-px size-4 shrink-0" stroke={1.7} />
        <span>
          <span className="font-medium text-[var(--text)]">{t('turnedOff')}.</span>{' '}
          {t('turnedOffNote')}
        </span>
      </p>
    )
  }

  const note = name ? t('availableOn', { package: name }) : t('notOnPackage')

  // One slim row, the whole of it the way to the Package page: it stays
  // one line on a narrow phone, and the words "See packages" join in only
  // where there is room.
  return (
    <button
      type="button"
      onClick={onOpenPackage}
      aria-label={t('packageChip', { note })}
      className="mt-2 flex w-full items-center gap-2 rounded-tile bg-accent-wash px-3 py-2 text-start text-accent transition-colors hover:bg-accent-wash-hover focus-ring"
    >
      <IconCrown aria-hidden className="size-4 shrink-0" stroke={1.7} />
      <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">{note}</span>
      <span className="hidden shrink-0 text-[12px] opacity-80 sm:inline">{t('seePackages')}</span>
      <IconChevronRight aria-hidden className="size-4 shrink-0 rtl:rotate-180" stroke={1.8} />
    </button>
  )
}
