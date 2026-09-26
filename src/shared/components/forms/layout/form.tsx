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

/**
 * A titled group of fields inside a longer form.
 *
 * It draws its own panel. A page of plain stacked fields gives an eye nothing
 * to hold on to: the heading of one group sits as close to the last field of
 * the previous group as its own fields do, so everything reads as one wall.
 */
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
    <section
      className={cn(
        'flex flex-col rounded-[14px] border-[0.5px] border-[var(--line)]',
        'bg-[var(--surface)] p-4 sm:p-5',
        className,
      )}
    >
      <div className="flex flex-col gap-1 border-b-[0.5px] border-[var(--line-2)] pb-3.5">
        <h3 className="label-caps text-[var(--muted)]">{title}</h3>
        {description ? (
          <p className="text-[13px] leading-snug text-[var(--muted)]">{description}</p>
        ) : null}
      </div>
      {/* Fields bring their own top padding, so the gap here is the extra. */}
      <div className="flex flex-col gap-3 pt-2">{children}</div>
    </section>
  )
}

/** Two fields side by side, stacking on narrow screens. */
export function FieldGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid gap-x-5 gap-y-3 sm:grid-cols-2', className)}>{children}</div>
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
