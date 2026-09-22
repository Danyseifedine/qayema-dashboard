import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/shared/utils/dom/cn'

export type LabelProps = ComponentProps<'label'> & {
  /** Adds the gold required marker, as the onboarding wizard does. */
  required?: boolean
  /** Adds a quiet "optional" note on the trailing side. */
  optionalText?: ReactNode
}

export function Label({ required, optionalText, className, children, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        'label-caps flex items-center justify-between text-[var(--muted)]',
        className,
      )}
      {...props}
    >
      <span>
        {children}
        {required ? (
          <span aria-hidden className="ms-1 text-[15px] text-accent">
            *
          </span>
        ) : null}
      </span>
      {optionalText ? (
        <span className="text-[12px] normal-case tracking-normal text-[var(--faint)]">
          {optionalText}
        </span>
      ) : null}
    </label>
  )
}
