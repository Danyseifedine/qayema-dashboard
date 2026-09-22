import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import qMark from '@/assets/images/brand/qayema-q.svg'
import wordmark from '@/assets/images/brand/qayema-wordmark.png'
import { NAV_GROUPS, isNavItemLocked, type NavItem } from '@/app/layouts/authenticated/nav-items'
import { cn } from '@/shared/utils/dom/cn'
import { SidebarGroup } from './sidebar-group'
import { SidebarItem } from './sidebar-item'

export type SidebarProps = {
  activeKey: string
  onSelect: (item: NavItem) => void
  collapsed: boolean
  onToggleCollapse: () => void
  /** False until the owner picks a template; gates the menu and QR studio. */
  hasTemplate: boolean
  /** Plan features from the session payload. */
  features: { qr_studio: boolean }
  className?: string
}

/**
 * The dashboard's primary navigation. Collapses to an icon rail on desktop and
 * is rendered inside a drawer on small screens by the layout.
 */
export function Sidebar({
  activeKey,
  onSelect,
  collapsed,
  onToggleCollapse,
  hasTemplate,
  features,
  className,
}: SidebarProps) {
  const isLocked = (item: NavItem) => isNavItemLocked(item.key, { hasTemplate, features })

  return (
    <nav
      aria-label="Dashboard"
      className={cn(
        'flex h-full flex-col border-e-[0.5px] border-[var(--line)] bg-[var(--surface)]',
        'transition-[width] duration-300 [transition-timing-function:var(--ease-qayema)]',
        collapsed ? 'w-[72px]' : 'w-[248px]',
        className,
      )}
    >
      <div
        className={cn(
          'flex h-[68px] shrink-0 items-center border-b-[0.5px] border-[var(--line)]',
          collapsed ? 'justify-center px-2' : 'px-4',
        )}
      >
        {collapsed ? (
          <img src={qMark} alt="Qayema" className="size-8" />
        ) : (
          <img src={wordmark} alt="Qayema" className="h-9 w-auto" />
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.key} label={group.label} collapsed={collapsed}>
            {group.items.map((item) => (
              <SidebarItem
                key={item.key}
                icon={item.icon}
                label={item.label}
                active={item.key === activeKey}
                collapsed={collapsed}
                locked={isLocked(item)}
                onSelect={() => onSelect(item)}
              />
            ))}
          </SidebarGroup>
        ))}
      </div>

      <div className="hidden shrink-0 border-t-[0.5px] border-[var(--line)] p-3 lg:block">
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex w-full items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5',
            'text-[13px] text-[var(--muted)] transition-colors duration-200',
            'hover:bg-[var(--hover-wash)] hover:text-[var(--text)]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-on)]',
            collapsed && 'justify-center px-0',
          )}
        >
          {collapsed ? (
            <PanelLeftOpen aria-hidden className="size-[18px] shrink-0 rtl:rotate-180" />
          ) : (
            <>
              <PanelLeftClose aria-hidden className="size-[18px] shrink-0 rtl:rotate-180" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </nav>
  )
}
