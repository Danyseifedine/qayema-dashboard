import { IconArrowLeft } from '@tabler/icons-react'
import type { ReactNode } from 'react'
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
  /** Home and More: no bar but a heading of their own, the crown and the
   *  avatar on its title's line. */
  hero?: TopbarHero
  onOpenPackage: () => void
  onOpenAccount: () => void
  onLogout: () => void
}

/**
 * Sticky header over the content column. Mirrors the portal navbar's treatment
 * when it scrolls: the page colour at 78% behind a heavy blur, over a hairline
 * border. On Home and More it is no bar at all: their heading, in the page's flow.
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

  return (
    <header
      className={cn(
        hero
          ? 'relative z-30'
          : [
              'sticky top-0 z-30 border-b-[0.5px] border-[var(--line-2)]',
              'bg-[color-mix(in_srgb,var(--bg)_78%,transparent)]',
              'backdrop-blur-[22px] backdrop-saturate-[160%]',
            ],
      )}
    >
      <div
        className={cn('flex gap-3 px-4 sm:px-6', hero ? 'pt-4 sm:pt-8' : 'h-[68px] items-center')}
      >
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label={t('layout.back')}
            className={cn(
              'grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] lg:hidden',
              'text-[var(--text)] transition-colors hover:bg-[var(--hover-wash)]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-on)]',
            )}
          >
            <IconArrowLeft aria-hidden className="size-5 rtl:rotate-180" />
          </button>
        ) : null}

        <h1 className="sr-only">{title}</h1>
        {/* On Home and More they sit on the title's line, centred with it. */}
        {hero ? (
          <Hero {...hero}>{actions}</Hero>
        ) : (
          <div className="ms-auto flex shrink-0 items-center gap-3">{actions}</div>
        )}
      </div>
    </header>
  )
}

function Hero({ eyebrow, title, subtitle, children }: TopbarHero & { children: ReactNode }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[9px] font-medium tracking-[0.18em] text-[var(--muted)] uppercase sm:text-[10px]">
        {eyebrow}
      </p>
      <div className="mt-1.5 flex items-center gap-3">
        <p className="min-w-0 flex-1 truncate font-display text-[28px] leading-[1.05] font-semibold sm:text-[32px]">
          {title}
        </p>
        <div className="flex shrink-0 items-center gap-3">{children}</div>
      </div>
      <p className="mt-1.5 pe-24 text-[11.5px] leading-[1.35] text-[var(--muted)] sm:pe-0 sm:text-[13px]">
        {subtitle}
      </p>
    </div>
  )
}
