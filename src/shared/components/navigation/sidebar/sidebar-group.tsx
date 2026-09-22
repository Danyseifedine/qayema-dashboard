import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/dom/cn'

export type SidebarGroupProps = {
  label?: string
  collapsed?: boolean
  children: ReactNode
}

/** A titled run of sidebar items. The heading hides on the icon rail. */
export function SidebarGroup({ label, collapsed = false, children }: SidebarGroupProps) {
  return (
    <div className="flex flex-col gap-0.5">
      {label && !collapsed ? (
        <p className="label-caps px-3 pt-4 pb-1.5 text-[var(--faint)]">{label}</p>
      ) : null}
      {label && collapsed ? (
        <span aria-hidden className={cn('mx-auto my-2 h-px w-6 bg-[var(--line)]')} />
      ) : null}
      {children}
    </div>
  )
}
