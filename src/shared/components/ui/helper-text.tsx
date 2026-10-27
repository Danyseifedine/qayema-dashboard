import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/dom/cn'

export type HelperTextProps = {
  children: ReactNode
  tone?: 'muted' | 'error' | 'warning'
  id?: string
  /** `status` for a caution that appears as the owner types, so it is read out. */
  role?: 'status' | 'alert'
  className?: string
}

/** The 12px line under a field: hint, validation error or caution. */
export function HelperText({ children, tone = 'muted', id, role, className }: HelperTextProps) {
  return (
    <p
      id={id}
      role={role}
      className={cn(
        'text-[12px] leading-[1.45]',
        tone === 'muted' && 'text-[var(--muted)]',
        tone === 'error' && 'text-status-danger',
        tone === 'warning' && 'text-status-warn',
        className,
      )}
    >
      {children}
    </p>
  )
}
