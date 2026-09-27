import { Palette } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('templates')
  const templates = useTemplates()
  const select = useSelectTemplate()

  const list = templates.data?.data ?? []
  const current = templates.data?.meta.current ?? null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[19px] leading-tight">{t('page.title')}</h2>
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            {current === null ? t('page.pickPrompt') : t('page.switchFree')}
          </p>
        </div>
      </div>

      {current === null ? (
        <Alert variant="info" title={t('needsDesign.title')}>
          {t('needsDesign.description')}
        </Alert>
      ) : null}

      {select.isError ? (
        <Alert variant="error" title={t('toast.switchFailed')}>
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
        <EmptyState icon={Palette} title={t('empty.title')} description={t('empty.description')} />
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
