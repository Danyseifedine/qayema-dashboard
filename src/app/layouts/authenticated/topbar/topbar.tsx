import { IconArrowLeft } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import type { Locale } from '@/shared/constants/locales'
import { cn } from '@/shared/utils/dom/cn'
import { PackagePill } from '@/app/layouts/authenticated/topbar/package-pill'
import type { PackageTier } from '@/app/layouts/authenticated/topbar/package-tier'
import { UserMenu } from '@/app/layouts/authenticated/topbar/user-menu'

/** A small label over a big title, then a line under it. */
export type TopbarHero = { eyebrow: string; title: string; subtitle: string }

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
  /** On a phone, a section opened from More shows the way back to it. */
  onBack?: () => void
  /** The page's heading: a small label, its name and what it is for. */
  hero: TopbarHero
  onOpenPackage: () => void
  onOpenAccount: () => void
  onLogout: () => void
}

/**
 * Every page's heading, the same on all of them, in the page's flow rather
 * than a bar: a small label, the page's name in large type with the crown
 * and the avatar on its line, and what the page is for. On a phone, a
 * section opened from More adds its way back on a row of its own above.
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
  onBack,
  hero,
  onOpenPackage,
  onOpenAccount,
  onLogout,
}: TopbarProps) {
  const { t } = useTranslation()
  const actions = (
    <>
      <PackagePill
        label={packageName}
        tier={packageTier}
        daysLeft={packageDaysLeft}
        onClick={onOpenPackage}
      />
      <UserMenu
        name={user.name}
        login={user.login}
        publicUrl={publicUrl}
        locale={locale}
        onLocaleChange={onLocaleChange}
        onOpenAccount={onOpenAccount}
        onLogout={onLogout}
      />
    </>
  )

  const back = onBack ? (
    <button
      type="button"
      onClick={onBack}
      aria-label={t('layout.back')}
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] lg:hidden',
        'text-[var(--text)] transition-colors hover:bg-[var(--hover-wash)]',
        'focus-ring',
      )}
    >
      <IconArrowLeft aria-hidden className="size-5 rtl:rotate-180" />
    </button>
  ) : null

  return (
    <header className="relative z-30 px-4 pt-4 sm:px-6 sm:pt-8">
      <h1 className="sr-only">{title}</h1>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
        {back ? (
          // The arrow, not its tap target, lines up with the heading.
          <div className="col-span-2 row-start-1 mb-1 -ms-2.5 lg:hidden">{back}</div>
        ) : null}
        <p className="col-span-2 row-start-2 text-[9px] font-medium tracking-[0.18em] text-[var(--muted)] uppercase sm:text-[10px]">
          {hero.eyebrow}
        </p>
        <p className="col-start-1 row-start-3 mt-1.5 truncate font-display text-[28px] leading-[1.05] font-semibold sm:text-[32px]">
          {hero.title}
        </p>
        <div className="col-start-2 row-start-3 mt-1.5 flex items-center gap-3">{actions}</div>
        <p className="col-span-2 row-start-4 mt-1.5 pe-24 text-[11.5px] leading-[1.35] text-[var(--muted)] sm:pe-0 sm:text-[13px]">
          {hero.subtitle}
        </p>
      </div>
    </header>
  )
}
