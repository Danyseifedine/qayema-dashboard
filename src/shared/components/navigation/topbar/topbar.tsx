import { Menu } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Locale } from '@/shared/constants/locales'
import { cn } from '@/shared/utils/dom/cn'
import { PackagePill } from './package-pill'
import { LanguageSwitcher } from './language-switcher'
import { ThemeToggle } from './theme-toggle'
import { UserMenu } from './user-menu'

export type TopbarProps = {
  title: string
  /** Optional line under the title, e.g. the public menu link. */
  subtitle?: ReactNode
  user: { name: string; email: string }
  /** The package the restaurant is on, in the current language. */
  packageName: string
  publicUrl?: string | null
  locale: Locale
  onLocaleChange: (locale: Locale) => void
  onOpenMobileNav: () => void
  onOpenPackage: () => void
  onOpenProfile: () => void
  onLogout: () => void
}

/**
 * Sticky header over the content column. Mirrors the portal navbar's treatment
 * when it scrolls: the page colour at 78% behind a heavy blur, over a hairline
 * border.
 */
export function Topbar({
  title,
  subtitle,
  user,
  packageName,
  publicUrl,
  locale,
  onLocaleChange,
  onOpenMobileNav,
  onOpenPackage,
  onOpenProfile,
  onLogout,
}: TopbarProps) {
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
          aria-label="Open navigation"
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] lg:hidden',
            'text-[var(--muted)] transition-colors hover:bg-[var(--hover-wash)] hover:text-[var(--text)]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-on)]',
          )}
        >
          <Menu aria-hidden className="size-5" />
        </button>

        <div className="me-auto min-w-0">
          <h1 className="truncate font-display text-[20px] leading-tight">{title}</h1>
          {subtitle ? (
            <div className="truncate text-[12px] text-[var(--muted)]">{subtitle}</div>
          ) : null}
        </div>

        <PackagePill label={packageName} onClick={onOpenPackage} />
        <LanguageSwitcher
          value={locale}
          onChange={onLocaleChange}
          className="hidden sm:inline-flex"
        />
        <ThemeToggle className="hidden sm:block" />
        <UserMenu
          name={user.name}
          email={user.email}
          publicUrl={publicUrl}
          onOpenProfile={onOpenProfile}
          onLogout={onLogout}
        />
      </div>
    </header>
  )
}
