import { useTranslation } from 'react-i18next'
import { CardGridSkeleton, ErrorState, PictureEmptyState } from '@/shared/components/feedback'
import { Alert } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { useTurnedOff } from '@/features/auth'
import { TurnedOffNotice, usePackageFor } from '@/features/package'
import { nameOr } from '@/shared/utils/string/translated'
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
 * includes premium designs. When an admin turned premium designs off for
 * this restaurant, the locked ones say so, with the way to ask for them back.
 */
export function DesignPage({ locale, onOpenPackage }: DesignPageProps) {
  const { t } = useTranslation('design')
  const designs = useDesigns()
  const select = useSelectDesign()
  const unlockedBy = usePackageFor('premium_designs', locale)
  const turnedOff = useTurnedOff('premium_designs')

  const list = designs.data?.data ?? []
  const current = designs.data?.meta.current ?? null
  const shown = designs.data?.meta.shown ?? null
  // The chosen design needs a package the restaurant is no longer on.
  const chosen =
    current !== null && shown !== current ? list.find((d) => d.id === current) : undefined
  const fallback = list.find((d) => d.id === shown)
  // Nothing is said about the design in use until the list says what it is:
  // while it loads, "no design yet" would flash at an owner who has one.
  const needsDesign = designs.isSuccess && current === null

  return (
    <div className="flex flex-1 flex-col gap-4">
      {designs.isSuccess ? (
        <p className="text-[13px] text-[var(--muted)]">
          {needsDesign ? t('page.pickPrompt') : t('page.switchFree')}
        </p>
      ) : null}

      {needsDesign ? (
        <Alert variant="warning" title={t('needsDesign.title')}>
          {t('needsDesign.description')}
        </Alert>
      ) : null}

      {turnedOff && list.some((d) => d.locked) ? (
        <TurnedOffNotice flag="premium_designs" locale={locale} />
      ) : null}

      {chosen && fallback ? (
        <Alert variant="warning" title={t('fallback.title', { design: nameOf(chosen, locale) })}>
          {t(turnedOff ? 'fallback.turnedOff' : 'fallback.description', {
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
        <PictureEmptyState
          fill
          picture="/assets/images/dashboard/more/design.webp"
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
              turnedOff={turnedOff}
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
  return nameOr(design.name, locale, design.slug)
}
