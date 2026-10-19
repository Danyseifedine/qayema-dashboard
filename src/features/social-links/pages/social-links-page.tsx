import { IconShare } from '@tabler/icons-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isAtLimit, LimitNotice } from '@/shared/components/data-display'
import { ConfirmDialog, EmptyState, ErrorState, SkeletonList } from '@/shared/components/feedback'
import { Alert, Button } from '@/shared/components/ui'
import { SocialLinkDialog } from '@/features/social-links/components/dialogs/social-link-dialog'
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

  const atLimit = isAtLimit(links.data?.meta)
  const allPlatformsUsed = taken.length >= SOCIAL_PLATFORMS.length

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LimitNotice used={links.data?.meta.used ?? 0} limit={links.data?.meta.limit ?? null} />
        <Button
          className="ms-auto"
          leadingIcon={<IconShare className="size-[18px]" />}
          // Not before the list arrives: the dialog picks its platform from
          // the ones still free, and would otherwise start on a taken one.
          disabled={links.data === undefined || atLimit || allPlatformsUsed}
          onClick={() => setDialog({ open: true, link: null })}
        >
          {t('page.add')}
        </Button>
      </div>

      {/* With every platform used, Add is simply off: nothing to warn about. */}
      {atLimit && !allPlatformsUsed ? <Alert variant="warning">{t('page.atLimit')}</Alert> : null}

      {links.isPending ? (
        <SkeletonList count={2} className="flex flex-col gap-3" itemClassName="h-[82px]" />
      ) : links.isError ? (
        <ErrorState description={links.error.message} onRetry={() => void links.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          fill
          icon={IconShare}
          title={t('page.emptyTitle')}
          description={t('page.emptyDescription', {
            // The best known few; "or wherever else" covers the rest.
            platforms: Object.values(PLATFORM_LABELS).slice(0, 4).join(', '),
          })}
          action={
            <Button disabled={atLimit} onClick={() => setDialog({ open: true, link: null })}>
              {t('page.addFirst')}
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
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
