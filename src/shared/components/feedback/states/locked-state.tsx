import { Lock, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/shared/components/ui'

export type LockedStateProps = {
  icon: LucideIcon
  title: string
  description: string
  /** What the locked thing would give, one line each. */
  includes: readonly string[]
  /** The package that unlocks it, shown as a chip above the title. */
  unlockedBy?: string
  action: { label: string; onClick: () => void }
  /** Anything more to show above the action, such as a teaser number. */
  children?: ReactNode
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
  includes,
  unlockedBy,
  action,
  children,
}: LockedStateProps) {
  return (
    <section className="flex flex-col gap-4 rounded-[14px] border-[0.5px] border-[var(--accent-border)] bg-[var(--accent-wash)] p-5">
      {/* On a phone the description takes the card's width; from sm up it
          lines up under the title, beside the icon. */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[var(--surface)] text-accent">
          <Icon aria-hidden className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col items-start gap-1">
          {unlockedBy ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[11px] font-medium text-ink">
              <Lock aria-hidden className="size-3" />
              {unlockedBy}
            </span>
          ) : (
            <Lock aria-hidden className="size-3.5 text-[var(--muted)]" />
          )}
          <h3 className="font-display text-[19px] leading-tight font-normal">{title}</h3>
        </div>
        <p className="col-span-2 text-[13px] leading-snug text-[var(--muted)] sm:col-span-1 sm:col-start-2">
          {description}
        </p>
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
      <Button className="self-start" onClick={action.onClick}>
        {action.label}
      </Button>
    </section>
  )
}
