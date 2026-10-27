import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { ExternalLink, RowActions } from '@/shared/components/ui'
import { withoutScheme } from '@/shared/utils/string/url'
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
      <span className="social-chip grid size-12 shrink-0 place-items-center rounded-card">
        <PlatformIcon platform={link.platform} className="size-6" stroke={1.6} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[14.5px] font-medium tracking-[-0.012em]">{label}</p>
        <ExternalLink href={link.url} className="force-ltr mt-0.5 max-w-full align-top">
          {withoutScheme(link.url)}
        </ExternalLink>
      </div>

      {/* The actions apart from what the link is, behind a hairline. */}
      <div className="flex shrink-0 items-center gap-0.5 self-stretch border-s-[0.5px] border-[var(--line)] ps-2">
        <RowActions
          editLabel={t('card.edit', { platform: label })}
          deleteLabel={t('card.remove', { platform: label })}
          onEdit={() => onEdit(link)}
          onDelete={() => onDelete(link)}
        />
      </div>
    </div>
  )
})
