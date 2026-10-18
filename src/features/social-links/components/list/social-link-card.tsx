import { IconExternalLink, IconPencil, IconTrash } from '@tabler/icons-react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui'
import { cn } from '@/shared/utils/dom/cn'
import {
  PLATFORM_LABELS,
  type SocialLink,
} from '@/features/social-links/schemas/social-link.schema'
import { PlatformIcon } from '@/features/social-links/components/platform/platform-icon'

export type SocialLinkCardProps = {
  link: SocialLink
  /** These take the link back so the page can pass callbacks of stable identity. */
  onEdit: (link: SocialLink) => void
  onDelete: (link: SocialLink) => void
}

/**
 * One social link: which platform, where it points, and the two things an
 * owner does to it. The address itself opens in a new tab, because the most
 * common reason to look at this page is to check the link still works.
 *
 * The plain glass card; its platform's colours are on the mark's block
 * alone (`.social-card`, `.social-chip`).
 */
export const SocialLinkCard = memo(function SocialLinkCard({
  link,
  onEdit,
  onDelete,
}: SocialLinkCardProps) {
  const { t } = useTranslation('social-links')
  const label = PLATFORM_LABELS[link.platform]

  return (
    <div
      data-platform={link.platform}
      className="social-card glass-card flex items-center gap-3.5 rounded-card p-3.5 sm:p-4"
    >
      <span className="social-chip grid size-12 shrink-0 place-items-center rounded-[12px]">
        <PlatformIcon platform={link.platform} className="size-6" stroke={1.6} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[14.5px] font-medium tracking-[-0.012em]">{label}</p>
        <a
          href={link.url}
          target="_blank"
          rel="noreferrer noopener"
          className={cn(
            'force-ltr mt-0.5 inline-flex max-w-full items-center gap-1.5 truncate align-top',
            'text-[12px] text-[var(--muted)] hover:text-accent hover:underline',
            'focus-ring',
          )}
        >
          <span className="truncate">{link.url.replace(/^https?:\/\//, '')}</span>
          <IconExternalLink aria-hidden className="size-3 shrink-0" />
        </a>
      </div>

      {/* The actions apart from what the link is, behind a hairline. */}
      <div className="flex shrink-0 items-center gap-0.5 self-stretch border-s-[0.5px] border-[var(--line)] ps-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(link)}
          aria-label={t('card.edit', { platform: label })}
        >
          <IconPencil aria-hidden className="size-[18px]" stroke={1.7} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(link)}
          aria-label={t('card.remove', { platform: label })}
          className="text-[var(--muted)] hover:bg-status-danger-wash hover:text-status-danger"
        >
          <IconTrash aria-hidden className="size-[18px]" stroke={1.7} />
        </Button>
      </div>
    </div>
  )
})
