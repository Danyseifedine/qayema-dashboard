import type { ComponentProps, ReactNode } from 'react'
import { SectionCard } from '@/shared/components/ui/section-card'
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
 * A titled group of fields inside a longer form: a `SectionCard`, its
 * fields stacked. A page of plain stacked fields gives an eye
 * nothing to hold on to; a card per group keeps them apart.
 */
export function FormSection({
  icon,
  title,
  description,
  action,
  children,
}: {
  /** Its gold mark beside the title, as on the other settings cards. */
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  /** A small control at the end of the title row, e.g. a close button. */
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <SectionCard icon={icon} title={title} description={description} action={action}>
      {/* Fields bring their own top padding, so the gap here is the extra. */}
      <div className="-mt-2 flex flex-col gap-3">{children}</div>
    </SectionCard>
  )
}

/** Two fields side by side, stacking on narrow screens. */
export function FieldGroup({ children }: { children: ReactNode }) {
  return <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2">{children}</div>
}

/** Submit/cancel row pinned to the end of a form. */
export function FormActions({
  children,
  align = 'end',
  className,
}: {
  children: ReactNode
  align?: 'end' | 'between'
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 pt-2',
        align === 'end' && 'justify-end',
        align === 'between' && 'justify-between',
        className,
      )}
    >
      {children}
    </div>
  )
}
