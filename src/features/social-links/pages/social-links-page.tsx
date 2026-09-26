import { Share2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { LimitNotice } from '@/features/menu/components/limits/limit-notice'
import { ConfirmDialog, EmptyState, ErrorState } from '@/shared/components/feedback'
import { Alert, Button } from '@/shared/components/ui'
import { SocialLinkDialog } from '../components/form/social-link-dialog'
import { SocialLinkCard } from '../components/list/social-link-card'
import { useDeleteSocialLink, useSocialLinks } from '../hooks/use-social-links'
import { PLATFORM_LABELS, SOCIAL_PLATFORMS, type SocialLink } from '../schemas/social-link.schema'

/**
 * The handful of places a guest can follow the restaurant, shown at the foot
 * of the public menu.
 *
 * Two ceilings apply at once: the package's allowance, and the fact that there
 * is one link per platform, so an owner with all four is full whatever their
 * package says.
 */
export function SocialLinksPage() {
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
          label="Social links"
          used={links.data?.meta.used ?? 0}
          limit={links.data?.meta.limit ?? null}
          description="Shown as icons at the bottom of your menu, so guests can follow you."
        />
        <Button
          size="sm"
          leadingIcon={<Share2 className="size-4" />}
          disabled={atLimit || allPlatformsUsed}
          onClick={() => setDialog({ open: true, link: null })}
        >
          Add link
        </Button>
      </div>

      {atLimit && !allPlatformsUsed ? (
        <Alert variant="warning">
          You have used every social link your plan allows. Remove one to add another.
        </Alert>
      ) : null}

      {allPlatformsUsed ? (
        <Alert variant="info">
          Every platform your menu can show already has a link. Edit one to point it somewhere else.
        </Alert>
      ) : null}

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
          title="No social links yet"
          description={`Add ${Object.values(PLATFORM_LABELS).join(', ')} or wherever else guests can find you.`}
          action={
            <Button disabled={atLimit} onClick={() => setDialog({ open: true, link: null })}>
              Add your first link
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
        title="Remove this link?"
        description="It disappears from your menu straight away. You can add it back at any time."
        confirmLabel="Remove"
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
