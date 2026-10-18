import { IconDotsVertical, type TablerIcon } from '@tabler/icons-react'
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useDismiss } from '@/shared/hooks/use-dismiss'
import { cn } from '@/shared/utils/dom/cn'

export type ActionMenuItem = {
  label: string
  /** A fuller name for screen readers, which starts with what `label` shows. */
  ariaLabel?: string
  icon: TablerIcon
  onSelect: () => void
  /** Removes something: drawn in the danger colour. */
  danger?: boolean
}

export type ActionMenuProps = {
  /** The ⋮ button's name: what the actions are for. */
  label: string
  items: ActionMenuItem[]
  disabled?: boolean
}

/**
 * A ⋮ button holding the actions a card needs only now and then, so the card
 * shows its one main action and stays quiet. Opens under the button toward
 * the inside, moves with the arrow keys, and closes on a choice, on Escape
 * (back to the button) or on a click outside.
 */
export function ActionMenu({ label, items, disabled = false }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)

  const dismiss = useCallback(() => setOpen(false), [])
  useDismiss({ open, onDismiss: dismiss, container, trigger })

  // Opening moves focus to the first action, as a menu does.
  useEffect(() => {
    if (open) menu.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
  }, [open])

  const close = () => {
    setOpen(false)
    trigger.current?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const entries = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')]
    const at = entries.indexOf(document.activeElement as HTMLButtonElement)
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      entries[(at + step + entries.length) % entries.length]?.focus()
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div ref={container} className="relative shrink-0">
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'grid size-8 place-items-center rounded-[var(--radius-control)] text-[var(--muted)] transition-colors',
          'hover:bg-[var(--hover-wash)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-40',
          'focus-ring',
          open && 'bg-[var(--hover-wash)] text-[var(--text)]',
        )}
      >
        <IconDotsVertical aria-hidden className="size-[18px]" />
      </button>

      {open ? (
        <div
          ref={menu}
          role="menu"
          aria-label={label}
          onKeyDown={onKeyDown}
          className="absolute end-0 top-[calc(100%+4px)] z-30 min-w-[180px] rounded-tile border-[0.5px] border-[var(--line)] bg-[var(--surface)] p-1 shadow-lift"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              aria-label={item.ariaLabel}
              onClick={() => {
                close()
                item.onSelect()
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-start text-[13.5px] transition-colors',
                'focus-visible:outline-none',
                item.danger
                  ? 'text-status-danger hover:bg-status-danger-wash focus-visible:bg-status-danger-wash'
                  : 'text-[var(--text)] hover:bg-[var(--hover-wash)] focus-visible:bg-[var(--hover-wash)]',
              )}
            >
              <item.icon aria-hidden className="size-4 shrink-0" />
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
