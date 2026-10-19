import type { TablerIcon } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/dom/cn'

export type SidebarItemProps = {
  icon: TablerIcon
  label: string
  active?: boolean
  collapsed?: boolean
  /** Dimmed and non-interactive, e.g. before a template is chosen. */
  locked?: boolean
  /** Trailing count or status marker. */
  badge?: ReactNode
  onSelect: () => void
}

/**
 * One row in the sidebar. The open page sits on the same gold card as the
 * open tab in the phone's bottom bar.
 */
export function SidebarItem({
  icon: Icon,
  label,
  active = false,
  collapsed = false,
  locked = false,
  badge,
  onSelect,
}: SidebarItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={locked}
      aria-current={active ? 'page' : undefined}
      // The label is the accessible name once the rail hides the text.
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        'group relative flex w-full items-center gap-3 rounded-[var(--radius-control)]',
        'text-[14px] transition-colors duration-200 [transition-timing-function:var(--ease-qayema)]',
        'focus-ring',
        collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5',
        active
          ? 'bg-[image:var(--tab-on)] font-medium text-accent shadow-[var(--tab-on-edge)]'
          : 'text-[var(--muted)] hover:bg-[var(--hover-wash)] hover:text-[var(--text)]',
        locked && 'cursor-not-allowed opacity-40 hover:bg-transparent',
      )}
    >
      <Icon aria-hidden className="size-[18px] shrink-0" />
      {collapsed ? null : <span className="truncate text-start">{label}</span>}
      {!collapsed && badge ? <span className="ms-auto shrink-0">{badge}</span> : null}
    </button>
  )
}
