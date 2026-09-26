import { ChartNoAxesColumn, Lock } from 'lucide-react'
import { Button } from '@/shared/components/ui'

const INCLUDES = [
  'Change against the period before, and 90-day and all-time ranges',
  'Your busiest hours and days',
  'What guests do: dishes added to the cart, WhatsApp, map and call taps',
  'What guests search for — and what they could not find',
  'Order value, average order and your most ordered dishes',
  'Phones, browsers and the languages guests read in',
]

export type AdvancedLockedProps = {
  onOpenPackage: () => void
}

/** Where the advanced analytics would be, on a package without them. */
export function AdvancedLocked({ onOpenPackage }: AdvancedLockedProps) {
  return (
    <section className="flex flex-col gap-4 rounded-[14px] border-[0.5px] border-[var(--accent-border)] bg-[var(--accent-wash)] p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[var(--surface)] text-accent">
          <ChartNoAxesColumn aria-hidden className="size-5" />
        </span>
        <div>
          <h3 className="flex items-center gap-1.5 text-[15px] font-semibold">
            Advanced analytics
            <Lock aria-hidden className="size-3.5 text-[var(--muted)]" />
          </h3>
          <p className="mt-0.5 text-[13px] leading-snug text-[var(--muted)]">
            Comes with the bigger packages. Your menu already records all of this, so it is there
            the day you move up.
          </p>
        </div>
      </div>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-2">
        {INCLUDES.map((line) => (
          <li key={line} className="flex gap-2">
            <span aria-hidden className="text-accent">
              •
            </span>
            {line}
          </li>
        ))}
      </ul>
      <Button className="self-start" onClick={onOpenPackage}>
        See packages
      </Button>
    </section>
  )
}
