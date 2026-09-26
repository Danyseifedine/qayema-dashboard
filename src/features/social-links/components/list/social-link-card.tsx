import { ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { memo } from 'react'
import { Button } from '@/shared/components/ui'
import { cn } from '@/shared/utils/dom/cn'
import { PLATFORM_LABELS, type SocialLink } from '../../schemas/social-link.schema'
import { PlatformIcon } from '../platform/platform-icon'

export type SocialLinkCardProps = {
  link: SocialLink
  /** These take the link back so the page can pass callbacks of stable identity. */
  onEdit: (link: SocialLink) => void
  onDelete: (link: SocialLink) => void
  className?: string
}

/**
 * One social link: which platform, where it points, and the two things an
 * owner does to it. The address itself opens in a new tab, because the most
 * common reason to look at this page is to check the link still works.
 */
export const SocialLinkCard = memo(function SocialLinkCard({
  link,
  onEdit,
  onDelete,
  className,
}: SocialLinkCardProps) {
  const label = PLATFORM_LABELS[link.platform]

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-[14px] border-[0.5px] border-[var(--line)]',
        'bg-[var(--surface)] p-3 transition-colors hover:border-[var(--line-strong)]',
        className,
      )}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-accent-wash text-accent">
        <PlatformIcon platform={link.platform} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium tracking-[-0.012em]">{label}</p>
        <a
          href={link.url}
          target="_blank"
          rel="noreferrer noopener"
          className={cn(
            'force-ltr mt-0.5 inline-flex max-w-full items-center gap-1 truncate align-top',
            'text-[12.5px] text-[var(--muted)] hover:text-accent hover:underline',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-on)]',
          )}
        >
          <span className="truncate">{link.url.replace(/^https?:\/\//, '')}</span>
          <ExternalLink aria-hidden className="size-3 shrink-0" />
        </a>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(link)}
          aria-label={`Edit ${label} link`}
        >
          <Pencil aria-hidden className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(link)}
          aria-label={`Remove ${label} link`}
          className="text-[var(--muted)] hover:bg-status-danger-wash hover:text-status-danger"
        >
          <Trash2 aria-hidden className="size-4" />
        </Button>
      </div>
    </div>
  )
})
