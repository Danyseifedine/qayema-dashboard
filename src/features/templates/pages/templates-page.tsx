import { Palette } from 'lucide-react'
import { CardGridSkeleton, EmptyState, ErrorState } from '@/shared/components/feedback'
import { Alert } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { TemplateCard } from '../components/store/template-card'
import { useSelectTemplate, useTemplates } from '../hooks/use-templates'

export type TemplatesPageProps = {
  locale: Locale
}

/**
 * The design store.
 *
 * A new restaurant has no design, and most of the dashboard stays locked until
 * one is chosen, so this is where a new owner starts. Every design is free on
 * every package: what a package grants is limits and features, never a look.
 */
export function TemplatesPage({ locale }: TemplatesPageProps) {
  const templates = useTemplates()
  const select = useSelectTemplate()

  const list = templates.data?.data ?? []
  const current = templates.data?.meta.current ?? null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[19px] leading-tight">Menu designs</h2>
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            {current === null
              ? 'Pick a design to open up the rest of your dashboard.'
              : 'Switching between designs is always free.'}
          </p>
        </div>
      </div>

      {current === null ? (
        <Alert variant="info" title="Your menu needs a design">
          Your dishes, QR code and settings unlock as soon as you choose one. You can change your
          mind whenever you like.
        </Alert>
      ) : null}

      {select.isError ? (
        <Alert variant="error" title="Could not switch design">
          {select.error.message}
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
              busy={select.isPending && select.variables === template.id}
              onSelect={() => select.mutate(template.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
