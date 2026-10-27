import { IconExternalLink } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/dom/cn'

/** A quiet link that leaves the dashboard, in a new tab, its arrow after it. */
export function ExternalLink({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex min-w-0 items-center gap-1 text-[12.5px] text-[var(--muted)] transition-colors hover:text-[var(--text)] focus-ring',
        className,
      )}
    >
      <span className="min-w-0 truncate">{children}</span>
      <IconExternalLink aria-hidden className="size-3 shrink-0" />
    </a>
  )
}
