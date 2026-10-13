import { IconMenu2 } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import type { Locale } from '@/shared/constants/locales'
import { cn } from '@/shared/utils/dom/cn'
import { PackagePill } from '@/app/layouts/authenticated/topbar/package-pill'
import type { PackageTier } from '@/app/layouts/authenticated/topbar/package-tier'
import { UserMenu } from '@/app/layouts/authenticated/topbar/user-menu'

export type TopbarProps = {
  /** The open page, for screen readers: the page itself shows its own heading. */
  title: string
  user: { name: string; login: string }
  /** The package the restaurant is on, in the current language. */
  packageName: string
  packageTier: PackageTier
  /** Whole days until the package ends; null when it does not end. */
  packageDaysLeft: number | null
  publicUrl?: string | null
  locale: Locale
  onLocaleChange: (locale: Locale) => void
  onOpenMobileNav: () => void
  onOpenPackage: () => void
  onOpenAccount: () => void
  onLogout: () => void
}

/**
 * Sticky header over the content column. Mirrors the portal navbar's treatment
 * when it scrolls: the page colour at 78% behind a heavy blur, over a hairline
 * border.
 */
export function Topbar({
  title,
  user,
  packageName,
  packageTier,
  packageDaysLeft,
  publicUrl,
  locale,
  onLocaleChange,
  onOpenMobileNav,
  onOpenPackage,
  onOpenAccount,
  onLogout,
}: TopbarProps) {
  const { t } = useTranslation()

  return (
    <header
      className={cn(
        'sticky top-0 z-30 border-b-[0.5px] border-[var(--line-2)]',
        'bg-[color-mix(in_srgb,var(--bg)_78%,transparent)]',
        'backdrop-blur-[22px] backdrop-saturate-[160%]',
      )}
    >
      <div className="flex h-[68px] items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label={t('layout.openNavigation')}
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] lg:hidden',
            'text-[var(--muted)] transition-colors hover:bg-[var(--hover-wash)] hover:text-[var(--text)]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-on)]',
          )}
        >
          <IconMenu2 aria-hidden className="size-5" />
        </button>

        <h1 className="sr-only">{title}</h1>

        <div className="ms-auto">
          <PackagePill
            label={packageName}
            tier={packageTier}
            daysLeft={packageDaysLeft}
            onClick={onOpenPackage}
          />
        </div>
        <UserMenu
          name={user.name}
          login={user.login}
          publicUrl={publicUrl}
          locale={locale}
          onLocaleChange={onLocaleChange}
          onOpenAccount={onOpenAccount}
          onLogout={onLogout}
        />
      </div>
    </header>
  )
}
