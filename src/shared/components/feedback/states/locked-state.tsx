import { Lock, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/shared/components/ui'
import { cn } from '@/shared/utils/dom/cn'

const NOTHING: readonly string[] = []

export type LockedStateProps = {
  icon: LucideIcon
  title: string
  description: string
  /** What the locked thing would give, one line each. */
  includes?: readonly string[]
  /** The package that unlocks it, shown as a chip beside the title. */
  unlockedBy?: string
  action?: { label: string; onClick: () => void }
  /** Anything more to show above the action, such as a teaser number. */
  children?: ReactNode
  className?: string
}

/**
 * Where something the package does not include would be: what it is, what it
 * would give, the package that has it, and the way to ask for it. The owner
 * always sees what they are missing rather than a blank space.
 */
export function LockedState({
  icon: Icon,
  title,
  description,
  includes = NOTHING,
  unlockedBy,
  action,
  children,
  className,
}: LockedStateProps) {
  return (
    <section
      className={cn(
        'flex flex-col gap-4 rounded-[14px] border-[0.5px] border-[var(--accent-border)] bg-[var(--accent-wash)] p-5',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[var(--surface)] text-accent">
          <Icon aria-hidden className="size-5" />
        </span>
        <div className="min-w-0">
          <h3 className="flex flex-wrap items-center gap-1.5 text-[15px] font-semibold">
            {title}
            <Lock aria-hidden className="size-3.5 text-[var(--muted)]" />
            {unlockedBy ? (
              <span className="rounded-full bg-gold px-2 py-0.5 text-[11px] font-medium text-ink">
                {unlockedBy}
              </span>
            ) : null}
          </h3>
          <p className="mt-0.5 text-[13px] leading-snug text-[var(--muted)]">{description}</p>
        </div>
      </div>
      {includes.length > 0 ? (
        <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-2">
          {includes.map((line) => (
            <li key={line} className="flex gap-2">
              <span aria-hidden className="text-accent">
                •
              </span>
              {line}
            </li>
          ))}
        </ul>
      ) : null}
      {children}
      {action ? (
        <Button className="self-start" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </section>
  )
}
