import { IconExternalLink, IconLanguage, IconLogout, IconUserCircle } from '@tabler/icons-react'
import { useCallback, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { Locale } from '@/shared/constants/locales'
import { menuItemClass, menuPanelClass } from '@/shared/components/ui'
import { useDismiss } from '@/shared/hooks/use-dismiss'
import { cn } from '@/shared/utils/dom/cn'
import { LanguageSwitcher } from '@/app/layouts/authenticated/topbar/language-switcher'

/** An everyday entry's colours, as in ActionMenu. */
const ITEM =
  'text-[var(--text)] hover:bg-[var(--hover-wash)] focus-visible:bg-[var(--hover-wash)] focus-visible:outline-none'

export type UserMenuProps = {
  name: string
  /** The email, or the username of an account made without one. */
  login: string
  /** Public menu URL, so the owner can see what guests see. */
  publicUrl?: string | null
  locale: Locale
  onLocaleChange: (locale: Locale) => void
  onOpenAccount: () => void
  onLogout: () => void
}

/**
 * Avatar button with a dropdown: the account, the public menu, and the
 * language, which is changed rarely enough not to need a place in the top
 * bar. Closes on outside click, on Escape, and returns
 * focus to the trigger so keyboard users are not stranded. The arrow keys
 * move between its entries, as in the other menus.
 */
export function UserMenu({
  name,
  login,
  publicUrl,
  locale,
  onLocaleChange,
  onOpenAccount,
  onLogout,
}: UserMenuProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const close = useCallback(() => setOpen(false), [])
  useDismiss({ open, onDismiss: close, container: containerRef, trigger: triggerRef })

  const initial = name.trim().charAt(0).toUpperCase() || '?'

  // From the avatar or an entry only: the language switch keeps its own arrows.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!open || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) return
    const entries = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')]
    const active = document.activeElement as HTMLElement
    const at = entries.indexOf(active)
    if (at === -1 && active !== triggerRef.current) return
    event.preventDefault()
    const step = event.key === 'ArrowDown' ? 1 : -1
    const from = at === -1 ? (step === 1 ? -1 : 0) : at
    entries[(from + step + entries.length) % entries.length]?.focus()
  }

  return (
    <div ref={containerRef} onKeyDown={onKeyDown} className="relative shrink-0">
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
          'focus-ring',
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
            menuPanelClass,
          )}
        >
          <div className="border-b-[0.5px] border-[var(--line)] px-3 pt-1.5 pb-2.5">
            <p className="truncate text-[14px] font-medium">{name}</p>
            <p className="truncate text-[12px] text-[var(--muted)]">{login}</p>
          </div>

          <div className="pt-1.5">
            {publicUrl ? (
              <a
                role="menuitem"
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className={cn(menuItemClass, ITEM)}
              >
                <IconExternalLink aria-hidden className="size-4 text-[var(--muted)]" />
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
              className={cn(menuItemClass, ITEM)}
            >
              <IconUserCircle aria-hidden className="size-4 text-[var(--muted)]" />
              {t('userMenu.account')}
            </button>
          </div>

          <div
            role="group"
            aria-label={t('userMenu.preferences')}
            className="mt-1.5 border-t-[0.5px] border-[var(--line)] pt-1.5"
          >
            <div className="flex items-center gap-2.5 px-3 py-1.5 text-[13.5px]">
              <IconLanguage aria-hidden className="size-4 text-[var(--muted)]" />
              <span className="me-auto">{t('userMenu.language')}</span>
              <LanguageSwitcher value={locale} onChange={onLocaleChange} />
            </div>
          </div>

          <div className="mt-1.5 border-t-[0.5px] border-[var(--line)] pt-1.5">
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false)
                onLogout()
              }}
              className={cn(
                menuItemClass,
                'text-status-danger hover:bg-status-danger-wash focus-visible:bg-status-danger-wash focus-visible:outline-none',
              )}
            >
              <IconLogout aria-hidden className="size-4 rtl:rotate-180" />
              {t('userMenu.logOut')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
