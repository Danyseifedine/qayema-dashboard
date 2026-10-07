import { IconPalette } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { CardGridSkeleton, EmptyState, ErrorState } from '@/shared/components/feedback'
import { Alert } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { usePackageFor } from '@/features/package'
import { translated } from '@/shared/utils/string/translated'
import { DesignCard } from '@/features/design/components/store/design-card'
import type { Design } from '@/features/design/schemas/design.schema'
import { useSelectDesign, useDesigns } from '@/features/design/hooks/use-designs'

export type DesignPageProps = {
  locale: Locale
  onOpenPackage: () => void
}

/**
 * The design store.
 *
 * A new restaurant has no design, and most of the dashboard stays locked until
 * one is chosen, so this is where a new owner starts. Every design is open on
 * every package except one marked premium, which needs the package that
 * includes premium designs.
 */
export function DesignPage({ locale, onOpenPackage }: DesignPageProps) {
  const { t } = useTranslation('design')
  const designs = useDesigns()
  const select = useSelectDesign()
  const unlockedBy = usePackageFor('premium_designs', locale)

  const list = designs.data?.data ?? []
  const current = designs.data?.meta.current ?? null
  const shown = designs.data?.meta.shown ?? null
  // The chosen design needs a package the restaurant is no longer on.
  const chosen =
    current !== null && shown !== current ? list.find((d) => d.id === current) : undefined
  const fallback = list.find((d) => d.id === shown)

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

      {chosen && fallback ? (
        <Alert variant="warning" title={t('fallback.title', { design: nameOf(chosen, locale) })}>
          {t('fallback.description', {
            design: nameOf(chosen, locale),
            fallback: nameOf(fallback, locale),
          })}
        </Alert>
      ) : null}

      {select.isError ? (
        <Alert variant="error" title={t('toast.switchFailed')}>
          {select.error.message}
        </Alert>
      ) : null}

      {designs.isPending ? (
        <CardGridSkeleton count={3} />
      ) : designs.isError ? (
        <ErrorState description={designs.error.message} onRetry={() => void designs.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={IconPalette}
          title={t('empty.title')}
          description={t('empty.description')}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((template) => (
            <DesignCard
              key={template.id}
              template={template}
              active={template.id === current}
              locale={locale}
              busy={select.isPending && select.variables === template.id}
              unlockedBy={unlockedBy}
              onSelect={() => select.mutate(template.id)}
              onOpenPackage={onOpenPackage}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function nameOf(design: Design, locale: Locale): string {
  const name = translated(design.name, locale)
  return name.missing ? design.slug : name.text
}
