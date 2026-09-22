import { cn } from '@/shared/utils/dom/cn'

export type SwitchProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  /** Required when no visible label is associated with the control. */
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  id?: string
  name?: string
  className?: string
}

/**
 * 38x22 track with an 18px knob, as `.ui-switch` in the portal. The portal
 * positions the knob with a physical `left`, which does not mirror in Arabic;
 * this one uses a logical inset so RTL works.
 */
export function Switch({
  checked,
  onChange,
  disabled = false,
  id,
  name,
  className,
  ...aria
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      name={name}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-[22px] w-[38px] shrink-0 rounded-full border-0 p-0',
        'transition-colors duration-200 [transition-timing-function:var(--ease-qayema)]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-on)]',
        'disabled:cursor-not-allowed disabled:opacity-40',
        checked ? 'bg-accent-fill' : 'bg-[var(--line-strong)]',
        className,
      )}
      {...aria}
    >
      <span
        aria-hidden
        className={cn(
          'absolute top-[2px] size-[18px] rounded-full bg-surface-themed shadow-[0_1px_3px_rgba(0,0,0,0.18)]',
          'transition-[inset-inline-start] duration-200 [transition-timing-function:var(--ease-qayema)]',
          checked ? 'start-[18px]' : 'start-[2px]',
        )}
      />
    </button>
  )
}
