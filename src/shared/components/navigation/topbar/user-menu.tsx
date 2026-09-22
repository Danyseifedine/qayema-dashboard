import { ChevronDown, ExternalLink, LogOut, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/shared/utils/dom/cn'

export type UserMenuProps = {
  name: string
  email: string
  /** Public menu URL, so the owner can see what guests see. */
  publicUrl?: string | null
  onOpenProfile: () => void
  onLogout: () => void
  className?: string
}

/**
 * Avatar button with a dropdown. Closes on outside click, on Escape, and
 * returns focus to the trigger so keyboard users are not stranded.
 */
export function UserMenu({
  name,
  email,
  publicUrl,
  onOpenProfile,
  onLogout,
  className,
}: UserMenuProps) {
  const [open, setOpen] = useState(false)
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
    <div ref={containerRef} className={cn('relative shrink-0', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-2 rounded-[var(--radius-control)] border-[0.5px] border-[var(--line)] p-1 ps-1 pe-2',
          'transition-colors duration-200 hover:bg-[var(--hover-wash)]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-on)]',
        )}
      >
        <span
          aria-hidden
          className="grid size-7 shrink-0 place-items-center rounded-full bg-gold text-[12px] font-medium text-ink"
        >
          {initial}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            'size-3.5 text-[var(--muted)] transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
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
                View public menu
              </a>
            ) : null}

            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false)
                onOpenProfile()
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] text-[var(--text)] transition-colors hover:bg-[var(--hover-wash)]"
            >
              <UserRound aria-hidden className="size-4 text-[var(--muted)]" />
              Profile
            </button>

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
              Log out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
