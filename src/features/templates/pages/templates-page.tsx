import { Palette } from 'lucide-react'
import { useState } from 'react'
import {
  CardGridSkeleton,
  ConfirmDialog,
  EmptyState,
  ErrorState,
} from '@/shared/components/feedback'
import { Alert, Button } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { TemplateCard } from '../components/store/template-card'
import { useSelectTemplate, useTemplates, useUnlockTemplate } from '../hooks/use-templates'
import type { Template } from '../schemas/template.schema'

export type TemplatesPageProps = {
  locale: Locale
  /** Lets the "buy coins" prompt jump to the wallet. */
  onOpenWallet: () => void
}

/**
 * The design store.
 *
 * A new restaurant has no design, and most of the dashboard stays locked until
 * one is chosen, so this is where a new owner starts.
 */
export function TemplatesPage({ locale, onOpenWallet }: TemplatesPageProps) {
  const templates = useTemplates()
  const select = useSelectTemplate()
  const unlock = useUnlockTemplate()

  const [pendingUnlock, setPendingUnlock] = useState<Template | null>(null)

  const list = templates.data?.data ?? []
  const current = templates.data?.meta.current ?? null
  const balance = templates.data?.meta.balance ?? 0

  // A 402 carries the shortfall; anything else is shown as-is.
  const shortfall = unlock.error?.isPaymentRequired === true ? unlock.error.shortfall : null

  const confirmUnlock = () => {
    if (!pendingUnlock) return
    unlock.mutate(pendingUnlock.id, { onSuccess: () => setPendingUnlock(null) })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[19px] leading-tight">Menu designs</h2>
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            {current === null
              ? 'Pick a design to open up the rest of your dashboard.'
              : 'Switching between designs you own is always free.'}
          </p>
        </div>
        <span className="text-[12.5px] text-[var(--muted)]">
          Balance: <span className="tabular-nums text-accent">{balance.toLocaleString()}</span>{' '}
          coins
        </span>
      </div>

      {current === null ? (
        <Alert variant="info" title="Your menu needs a design">
          Your dishes, QR code and settings unlock as soon as you choose one. The free design is
          enough to get started.
        </Alert>
      ) : null}

      {select.isError ? (
        <Alert variant="error" title="Could not switch design">
          {select.error.message}
        </Alert>
      ) : null}

      {unlock.isError ? (
        <Alert variant={unlock.error.isPaymentRequired ? 'warning' : 'error'} title="Not unlocked">
          {unlock.error.message}
          {shortfall !== null ? (
            <div className="mt-2">
              <Button size="sm" onClick={onOpenWallet}>
                Get {shortfall.toLocaleString()} more coins
              </Button>
            </div>
          ) : null}
        </Alert>
      ) : null}

      {templates.isPending ? (
        <CardGridSkeleton count={3} />
      ) : templates.isError ? (
        <ErrorState
          description={templates.error.message}
          onRetry={() => void templates.refetch()}
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Palette}
          title="No designs available"
          description="No menu designs are published yet. Check back shortly."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              active={template.id === current}
              locale={locale}
              busy={
                (select.isPending && select.variables === template.id) ||
                (unlock.isPending && unlock.variables === template.id)
              }
              onSelect={() => select.mutate(template.id)}
              onUnlock={() => setPendingUnlock(template)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingUnlock !== null}
        loading={unlock.isPending}
        title="Unlock this design?"
        description={
          pendingUnlock
            ? `This spends ${pendingUnlock.price.toLocaleString()} coins from your balance of ${balance.toLocaleString()}. Once unlocked it is yours for good.`
            : undefined
        }
        confirmLabel="Unlock"
        onConfirm={confirmUnlock}
        onCancel={() => setPendingUnlock(null)}
      />
    </div>
  )
}
