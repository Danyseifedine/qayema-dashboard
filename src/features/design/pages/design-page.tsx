import { Palette } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CardGridSkeleton, EmptyState, ErrorState } from '@/shared/components/feedback'
import { Alert } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { MenuColorSection } from '@/features/design/components/color/menu-color-section'
import { DesignCard } from '@/features/design/components/store/design-card'
import {
  useSaveDesignSettings,
  useSelectDesign,
  useDesigns,
} from '@/features/design/hooks/use-designs'
import type { Design, DesignSettings } from '@/features/design/schemas/design.schema'

const HEX = /^#[0-9a-fA-F]{6}$/

/**
 * The design in use's main colour, when it lets the owner choose one: what it
 * is now and what it starts as. Null for a design that ships a fixed look.
 */
function primaryColor(
  template: Design | undefined,
  settings: DesignSettings,
): { color: string; defaultColor: string } | null {
  const field = template?.settings_schema?.find(
    (row) => row.key === 'primary_color' && row.type === 'color',
  )
  if (!field || typeof field.default !== 'string' || !HEX.test(field.default)) return null

  const saved = settings.primary_color
  return {
    color: typeof saved === 'string' && HEX.test(saved) ? saved : field.default,
    defaultColor: field.default,
  }
}

export type DesignPageProps = {
  locale: Locale
}

/**
 * The design store.
 *
 * A new restaurant has no design, and most of the dashboard stays locked until
 * one is chosen, so this is where a new owner starts. Every design is free on
 * every package: what a package grants is limits and features, never a look.
 */
export function DesignPage({ locale }: DesignPageProps) {
  const { t } = useTranslation('design')
  const designs = useDesigns()
  const select = useSelectDesign()
  const saveSettings = useSaveDesignSettings()

  const list = designs.data?.data ?? []
  const current = designs.data?.meta.current ?? null
  const color = primaryColor(
    list.find((template) => template.id === current),
    designs.data?.meta.settings ?? {},
  )

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

      {color ? (
        <MenuColorSection
          color={color.color}
          defaultColor={color.defaultColor}
          saving={saveSettings.isPending}
          onSave={(primary_color) => saveSettings.mutate({ primary_color })}
        />
      ) : null}

      {designs.isPending ? (
        <CardGridSkeleton count={3} />
      ) : designs.isError ? (
        <ErrorState description={designs.error.message} onRetry={() => void designs.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState icon={Palette} title={t('empty.title')} description={t('empty.description')} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((template) => (
            <DesignCard
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
