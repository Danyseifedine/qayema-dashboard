import { useId, type ReactNode } from 'react'
import { Switch } from '@/shared/components/ui/switch'
import { cn } from '@/shared/utils/dom/cn'

export type SwitchRowProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  description?: ReactNode
  className?: string
}

/**
 * A label and its line on one side, the switch on the other: every on/off
 * setting in a form (SwitchField is this, bound to a form field).
 */
export function SwitchRow({ checked, onChange, label, description, className }: SwitchRowProps) {
  const id = useId()

  return (
    <div className={cn('flex items-center justify-between gap-3.5', className)}>
      <div className="flex flex-col gap-0.5">
        <span id={`${id}-label`} className="text-[14px] text-[var(--text)]">
          {label}
        </span>
        {description ? (
          <span id={`${id}-desc`} className="text-[12px] leading-[1.45] text-[var(--muted)]">
            {description}
          </span>
        ) : null}
      </div>
      <Switch
        checked={checked}
        onChange={onChange}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-desc` : undefined}
      />
    </div>
  )
}
