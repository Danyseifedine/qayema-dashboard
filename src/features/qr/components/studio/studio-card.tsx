import type { TablerIcon } from '@tabler/icons-react'
import { useId, type ReactNode } from 'react'

export type StudioCardProps = {
  icon: TablerIcon
  title: string
  /** A line on what the card is for: under the title on a phone, at its end on a wider screen. */
  description?: string
  children: ReactNode
}

/** One part of the QR page: a glass card under a small gold-marked heading. */
export function StudioCard({ icon: Icon, title, description, children }: StudioCardProps) {
  const id = useId()

  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-3 glass-card rounded-card p-3.5 sm:gap-4 sm:p-4"
    >
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <Icon aria-hidden className="size-[18px] shrink-0 text-accent" stroke={1.8} />
        <h3
          id={id}
          className="font-sans text-[11px] font-medium tracking-[0.2em] text-[var(--text)] uppercase sm:text-[12px]"
        >
          {title}
        </h3>
        {description ? (
          <p className="basis-full text-[11.5px] leading-snug text-[var(--muted)] sm:ms-auto sm:basis-auto sm:text-end sm:text-[12.5px]">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  )
}
