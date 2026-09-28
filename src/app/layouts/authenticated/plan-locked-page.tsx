import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { NavItem } from '@/app/layouts/authenticated/nav-items'
import { usePackageFor } from '@/features/package'
import { LockedState } from '@/shared/components/feedback'
import type { Locale } from '@/shared/constants/locales'

/** The sections a package can close, each with its own copy in common.json. */
const LOCKABLE = ['analytics', 'appearance', 'orders'] as const
type LockableKey = (typeof LOCKABLE)[number]

const INCLUDES = ['one', 'two', 'three'] as const

function isLockable(key: string): key is LockableKey {
  return (LOCKABLE as readonly string[]).includes(key)
}

export type PlanLockedPageProps = {
  item: NavItem
  locale: Locale
  onOpenPackage: () => void
  /** Anything the section can still show, such as the analytics teaser. */
  children?: ReactNode
}

/**
 * A section the package does not include: what it is for, what it would give,
 * the package that has it, and the way to the Package page. It opens from the
 * sidebar like any section, so the owner learns what they are missing.
 */
export function PlanLockedPage({ item, locale, onOpenPackage, children }: PlanLockedPageProps) {
  const { t } = useTranslation()
  const unlockedBy = usePackageFor(item.requiresPlan!, locale)
  const key = isLockable(item.key) ? item.key : null

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-[19px] leading-tight">{t(item.labelKey)}</h2>
      <LockedState
        icon={item.icon}
        title={key ? t(`planLocked.${key}.title`) : t(item.labelKey)}
        description={
          unlockedBy
            ? t('planLocked.comesWith', { name: unlockedBy })
            : t('planLocked.notOnPackage')
        }
        includes={key ? INCLUDES.map((line) => t(`planLocked.${key}.includes.${line}`)) : []}
        unlockedBy={unlockedBy ?? undefined}
        action={{ label: t('planLocked.cta'), onClick: onOpenPackage }}
      >
        {children}
      </LockedState>
    </div>
  )
}
