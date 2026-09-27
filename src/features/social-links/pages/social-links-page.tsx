import { Share2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LimitNotice } from '@/shared/components/data-display/badges/limit-notice'
import { ConfirmDialog, EmptyState, ErrorState } from '@/shared/components/feedback'
import { Alert, Button } from '@/shared/components/ui'
import { SocialLinkDialog } from '@/features/social-links/components/form/social-link-dialog'
import { SocialLinkCard } from '@/features/social-links/components/list/social-link-card'
import { useDeleteSocialLink, useSocialLinks } from '@/features/social-links/hooks/use-social-links'
import {
  PLATFORM_LABELS,
  SOCIAL_PLATFORMS,
  type SocialLink,
} from '@/features/social-links/schemas/social-link.schema'

/**
 * The handful of places a guest can follow the restaurant, shown at the foot
 * of the public menu.
 *
 * Two ceilings apply at once: the package's allowance, and the fact that there
 * is one link per platform, so an owner with all four is full whatever their
 * package says.
 */
export function SocialLinksPage() {
  const { t } = useTranslation('social-links')
  const links = useSocialLinks()
  const remove = useDeleteSocialLink()

  const [dialog, setDialog] = useState<{ open: boolean; link: SocialLink | null }>({
    open: false,
    link: null,
  })
  const [pendingDelete, setPendingDelete] = useState<SocialLink | null>(null)

  const openEdit = useCallback((link: SocialLink) => setDialog({ open: true, link }), [])
  const confirmDelete = useCallback((link: SocialLink) => setPendingDelete(link), [])

  const list = links.data?.data ?? []
  const taken = list.map((link) => link.platform)

  // An unlimited package reports a null limit, which is never reached.
  const atLimit =
    links.data !== undefined &&
    links.data.meta.limit !== null &&
    links.data.meta.used >= links.data.meta.limit
  const allPlatformsUsed = taken.length >= SOCIAL_PLATFORMS.length

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LimitNotice
          label={t('page.limitLabel')}
          used={links.data?.meta.used ?? 0}
          limit={links.data?.meta.limit ?? null}
          description={t('page.limitDescription')}
        />
        <Button
          size="sm"
          leadingIcon={<Share2 className="size-4" />}
          disabled={atLimit || allPlatformsUsed}
          onClick={() => setDialog({ open: true, link: null })}
        >
          {t('page.add')}
        </Button>
      </div>

      {atLimit && !allPlatformsUsed ? <Alert variant="warning">{t('page.atLimit')}</Alert> : null}

      {allPlatformsUsed ? <Alert variant="info">{t('page.allPlatformsUsed')}</Alert> : null}

      {links.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-[14px] bg-[var(--hover-wash)]" />
          ))}
        </div>
      ) : links.isError ? (
        <ErrorState description={links.error.message} onRetry={() => void links.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          fill
          icon={Share2}
          title={t('page.emptyTitle')}
          description={t('page.emptyDescription', {
            platforms: Object.values(PLATFORM_LABELS).join(', '),
          })}
          action={
            <Button disabled={atLimit} onClick={() => setDialog({ open: true, link: null })}>
              {t('page.addFirst')}
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((link) => (
            <SocialLinkCard key={link.id} link={link} onEdit={openEdit} onDelete={confirmDelete} />
          ))}
        </div>
      )}

      <SocialLinkDialog
        open={dialog.open}
        link={dialog.link}
        taken={taken}
        onClose={() => setDialog({ open: false, link: null })}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        destructive
        loading={remove.isPending}
        title={t('page.removeTitle')}
        description={t('page.removeDescription')}
        confirmLabel={t('page.removeConfirm')}
        onConfirm={() => {
          if (pendingDelete) {
            remove.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) })
          }
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
