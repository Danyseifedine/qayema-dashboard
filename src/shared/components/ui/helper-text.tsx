import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/dom/cn'

export type HelperTextProps = {
  children: ReactNode
  tone?: 'muted' | 'error' | 'success' | 'warning'
  id?: string
  className?: string
}

/** The 12px line under a field: hint, validation error, caution or confirmation. */
export function HelperText({ children, tone = 'muted', id, className }: HelperTextProps) {
  return (
    <p
      id={id}
      className={cn(
        'text-[12px] leading-[1.45]',
        tone === 'muted' && 'text-[var(--muted)]',
        tone === 'error' && 'text-status-danger',
        tone === 'success' && 'text-status-success',
        tone === 'warning' && 'text-status-warn',
        className,
      )}
    >
      {children}
    </p>
  )
}
