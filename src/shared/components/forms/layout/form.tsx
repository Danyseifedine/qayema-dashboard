import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/shared/utils/dom/cn'

/** The form element itself. Submission is wired by the caller's RHF handler. */
export function Form({ className, children, ...props }: ComponentProps<'form'>) {
  return (
    <form noValidate className={cn('flex flex-col gap-4', className)} {...props}>
      {children}
    </form>
  )
}

/** A titled group of fields inside a longer form. */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-col gap-1">
        <h3 className="label-caps text-[var(--muted)]">{title}</h3>
        {description ? <p className="text-[13px] text-[var(--muted)]">{description}</p> : null}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  )
}

/** Two fields side by side, stacking on narrow screens. */
export function FieldGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid gap-3.5 sm:grid-cols-2', className)}>{children}</div>
}

/** Submit/cancel row pinned to the end of a form. */
export function FormActions({
  children,
  align = 'end',
  className,
}: {
  children: ReactNode
  align?: 'start' | 'end' | 'between'
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 pt-2',
        align === 'end' && 'justify-end',
        align === 'start' && 'justify-start',
        align === 'between' && 'justify-between',
        className,
      )}
    >
      {children}
    </div>
  )
}
