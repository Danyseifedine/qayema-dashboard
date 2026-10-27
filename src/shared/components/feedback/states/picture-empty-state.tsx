import { useId, type ReactNode } from 'react'
import { cn } from '@/shared/utils/dom/cn'

export type PictureEmptyStateProps = {
  /** A photo of what the page will hold, on black: its edges fade into the page. */
  picture: string
  title: ReactNode
  description: ReactNode
  action?: ReactNode
  /** Grows into the height left in its flex column and centres itself there. */
  fill?: boolean
}

/**
 * A list with nothing in it yet, on a page that leads somewhere: a picture
 * of what will be here, its title in large type and the button that fills
 * it, straight on the page rather than in a card.
 */
export function PictureEmptyState({
  picture,
  title,
  description,
  action,
  fill = false,
}: PictureEmptyStateProps) {
  const id = useId()

  return (
    <section
      aria-labelledby={id}
      className={cn(
        'flex flex-col items-center px-2 py-4 text-center',
        fill && 'flex-1 justify-center',
      )}
    >
      <div className="night-picture">
        <img src={picture} alt="" aria-hidden decoding="async" />
      </div>
      <h2 id={id} className="font-display text-[26px] leading-tight sm:text-[28px]">
        {title}
      </h2>
      <p className="mt-2 max-w-sm text-[13.5px] leading-relaxed text-[var(--muted)]">
        {description}
      </p>
      {action ? <div className="mt-5 w-full max-w-xs">{action}</div> : null}
    </section>
  )
}
