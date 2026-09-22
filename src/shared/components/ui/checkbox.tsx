import { Check, Minus } from 'lucide-react'
import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/shared/utils/dom/cn'

export type CheckboxProps = Omit<ComponentProps<'input'>, 'type' | 'size'> & {
  label?: ReactNode
  description?: ReactNode
  /** Renders the dash state for a partially selected group. */
  indeterminate?: boolean
  tone?: 'default' | 'error'
}

/**
 * The portal hides the native input with `display:none`, which makes its
 * checkboxes unreachable by keyboard. Here the input is visually hidden but
 * still focusable, and the box picks up a ring from `peer-focus-visible`.
 */
export function Checkbox({
  label,
  description,
  indeterminate = false,
  tone = 'default',
  className,
  id,
  checked,
  disabled,
  ...props
}: CheckboxProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const on = Boolean(checked) || indeterminate

  return (
    <div className={cn('flex items-start gap-3', disabled && 'opacity-55', className)}>
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        className="peer sr-only"
        aria-describedby={description ? `${inputId}-desc` : undefined}
        {...props}
      />
      <label
        htmlFor={inputId}
        className={cn(
          'mt-px grid size-5 shrink-0 cursor-pointer place-items-center rounded-md border-[0.5px]',
          'transition-all duration-150 [transition-timing-function:var(--ease-qayema)]',
          'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--gold-on)]',
          on
            ? 'border-gold bg-gold text-ink'
            : 'border-[var(--line-strong)] bg-[var(--surface)] text-transparent',
          tone === 'error' && !on && 'border-danger',
          disabled && 'cursor-not-allowed',
        )}
      >
        {indeterminate ? (
          <Minus aria-hidden className="size-3" strokeWidth={3} />
        ) : (
          <Check
            aria-hidden
            className={cn('size-3 transition-transform duration-150', on ? 'scale-100' : 'scale-50')}
            strokeWidth={3}
          />
        )}
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
