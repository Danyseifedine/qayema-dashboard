import { ExternalLink, Languages, LogOut, Moon, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Switch } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { cn } from '@/shared/utils/dom/cn'
import { usePreferencesStore } from '@/stores/preferences.store'
import { LanguageSwitcher } from '@/app/layouts/authenticated/topbar/language-switcher'

export type UserMenuProps = {
  name: string
  email: string
  /** Public menu URL, so the owner can see what guests see. */
  publicUrl?: string | null
  locale: Locale
  onLocaleChange: (locale: Locale) => void
  onOpenAccount: () => void
  onLogout: () => void
}

/**
 * Avatar button with a dropdown: the account, the public menu, and the two
 * preferences (language, dark mode), which are changed rarely enough not to
 * need a place in the top bar. Closes on outside click, on Escape, and returns
 * focus to the trigger so keyboard users are not stranded.
 */
export function UserMenu({
  name,
  email,
  publicUrl,
  locale,
  onLocaleChange,
  onOpenAccount,
  onLogout,
}: UserMenuProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const dark = usePreferencesStore((state) => state.theme === 'dark')
  const setTheme = usePreferencesStore((state) => state.setTheme)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const initial = name.trim().charAt(0).toUpperCase() || '?'

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('userMenu.trigger')}
        className={cn(
          'grid size-9 place-items-center rounded-full bg-gold text-[13px] font-medium text-ink',
          'transition-[box-shadow] duration-200 hover:shadow-[0_0_0_3px_var(--ring-accent)]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-on)]',
          open && 'shadow-[0_0_0_3px_var(--ring-accent)]',
        )}
      >
        <span aria-hidden>{initial}</span>
      </button>

      {open ? (
        <div
          role="menu"
          className={cn(
            'absolute end-0 top-[calc(100%+8px)] z-50 min-w-[232px] overflow-hidden',
            'rounded-[14px] border-[0.5px] border-[var(--line)] bg-[var(--surface)] p-1.5',
            'shadow-lift',
          )}
        >
          <div className="border-b-[0.5px] border-[var(--line)] px-2.5 pt-1.5 pb-2.5">
            <p className="truncate text-[14px] font-medium">{name}</p>
            <p className="truncate text-[12px] text-[var(--muted)]">{email}</p>
          </div>

          <div className="pt-1.5">
            {publicUrl ? (
              <a
                role="menuitem"
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] text-[var(--text)] transition-colors hover:bg-[var(--hover-wash)]"
              >
                <ExternalLink aria-hidden className="size-4 text-[var(--muted)]" />
                {t('userMenu.viewPublicMenu')}
              </a>
            ) : null}

            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false)
                onOpenAccount()
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] text-[var(--text)] transition-colors hover:bg-[var(--hover-wash)]"
            >
              <UserRound aria-hidden className="size-4 text-[var(--muted)]" />
              {t('userMenu.account')}
            </button>
          </div>

          <div
            role="group"
            aria-label={t('userMenu.preferences')}
            className="mt-1.5 border-t-[0.5px] border-[var(--line)] pt-1.5"
          >
            <div className="flex items-center gap-2.5 px-2.5 py-1.5 text-[13.5px]">
              <Languages aria-hidden className="size-4 text-[var(--muted)]" />
              <span className="me-auto">{t('userMenu.language')}</span>
              <LanguageSwitcher value={locale} onChange={onLocaleChange} />
            </div>
            <label className="flex cursor-pointer items-center gap-2.5 px-2.5 py-2 text-[13.5px]">
              <Moon aria-hidden className="size-4 text-[var(--muted)]" />
              <span className="me-auto">{t('userMenu.darkMode')}</span>
              <Switch
                checked={dark}
                onChange={(on) => setTheme(on ? 'dark' : 'light')}
                aria-label={t('userMenu.darkMode')}
              />
            </label>
          </div>

          <div className="mt-1.5 border-t-[0.5px] border-[var(--line)] pt-1.5">
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false)
                onLogout()
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] text-status-danger transition-colors hover:bg-status-danger-wash"
            >
              <LogOut aria-hidden className="size-4 rtl:rotate-180" />
              {t('userMenu.logOut')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
