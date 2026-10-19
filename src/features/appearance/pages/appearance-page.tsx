import { DesignSettingsCard } from '@/features/appearance/components/design/design-settings-card'
import { FontsCard } from '@/features/appearance/components/fonts/fonts-card'
import {
  useAppearance,
  useSaveDesignSettings,
  useSaveFont,
} from '@/features/appearance/hooks/use-appearance'
import { ErrorState, SkeletonList } from '@/shared/components/feedback'
import type { Locale } from '@/shared/constants/locales'
import { translated, type TranslatableValue } from '@/shared/utils/string/translated'

export type AppearancePageProps = {
  locale: Locale
}

/**
 * How the menu looks. The design's own settings (colours, switches, choices)
 * belong to the design in use: each declares its own and remembers what the
 * owner picked for it. Fonts belong to the restaurant and follow it into every
 * design.
 */
export function AppearancePage({ locale }: AppearancePageProps) {
  const page = useAppearance()
  const saveSettings = useSaveDesignSettings()
  const saveFont = useSaveFont()

  if (page.isPending) {
    return <SkeletonList count={2} className="flex flex-1 flex-col gap-4" itemClassName="h-48" />
  }

  if (page.isError) {
    return (
      <div className="flex flex-1 flex-col">
        <ErrorState description={page.error.message} onRetry={() => void page.refetch()} />
      </div>
    )
  }

  const designName = translated(page.data.design.name as TranslatableValue, locale)

  return (
    <div className="flex flex-col gap-4">
      <DesignSettingsCard
        designName={designName.text}
        settings={page.data.settings}
        locale={locale}
        saving={saveSettings.isPending}
        onSave={(changes) => saveSettings.mutate(changes)}
      />

      <FontsCard
        fonts={page.data.fonts}
        onPick={(script, family) => saveFont.mutate({ script, family })}
      />
    </div>
  )
}
