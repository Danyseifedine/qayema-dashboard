import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/shared/utils/dom/cn'

export type RadioProps = Omit<ComponentProps<'input'>, 'type' | 'size'> & {
  label?: ReactNode
  description?: ReactNode
}

/** Keyboard-reachable counterpart to the portal's `.ui-radio`. */
export function Radio({ label, description, className, id, checked, disabled, ...props }: RadioProps) {
  const autoId = useId()
  const inputId = id ?? autoId

  return (
    <div className={cn('flex items-start gap-3', disabled && 'opacity-55', className)}>
      <input
        id={inputId}
        type="radio"
        checked={checked}
        disabled={disabled}
        className="peer sr-only"
        aria-describedby={description ? `${inputId}-desc` : undefined}
        {...props}
      />
      <label
        htmlFor={inputId}
        className={cn(
          'mt-px grid size-5 shrink-0 cursor-pointer place-items-center rounded-full border-[0.5px]',
          'bg-[var(--surface)] transition-colors duration-150',
          'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--gold-on)]',
          checked ? 'border-gold' : 'border-[var(--line-strong)]',
          disabled && 'cursor-not-allowed',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'size-2 rounded-full bg-gold transition-transform duration-150',
            checked ? 'scale-100' : 'scale-0',
          )}
        />
      </label>
      {label || description ? (
        <div className="flex flex-col gap-0.5">
          {label ? (
            <label htmlFor={inputId} className="cursor-pointer text-[14px] leading-snug text-[var(--text)]">
              {label}
            </label>
          ) : null}
          {description ? (
            <span id={`${inputId}-desc`} className="text-[12.5px] text-[var(--muted)]">
              {description}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
