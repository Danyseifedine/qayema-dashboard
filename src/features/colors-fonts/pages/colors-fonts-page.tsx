import { useTranslation } from 'react-i18next'
import { ColorsCard } from '@/features/colors-fonts/components/colors/colors-card'
import { FontsCard } from '@/features/colors-fonts/components/fonts/fonts-card'
import {
  useColorsFonts,
  useSaveColors,
  useSaveFont,
} from '@/features/colors-fonts/hooks/use-colors-fonts'
import { ErrorState } from '@/shared/components/feedback'
import type { Locale } from '@/shared/constants/locales'
import { translated, type TranslatableValue } from '@/shared/utils/string/translated'

export type ColorsFontsPageProps = {
  locale: Locale
}

/**
 * How the menu looks. Colours belong to the design in use — each design
 * declares its own and remembers what the owner picked for it. Fonts belong to
 * the restaurant and follow it into every design.
 */
export function ColorsFontsPage({ locale }: ColorsFontsPageProps) {
  const { t } = useTranslation('colors-fonts')
  const page = useColorsFonts()
  const saveColors = useSaveColors()
  const saveFont = useSaveFont()

  if (page.isPending) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="h-48 animate-pulse rounded-[14px] bg-[var(--hover-wash)]" />
        ))}
      </div>
    )
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
      <div>
        <h2 className="font-display text-[19px] leading-tight">{t('page.title')}</h2>
        <p className="mt-1 text-[13px] text-[var(--muted)]">{t('page.description')}</p>
      </div>

      <ColorsCard
        designName={designName.text}
        colors={page.data.colors}
        locale={locale}
        saving={saveColors.isPending}
        onSave={(changes) => saveColors.mutate(changes)}
      />

      <FontsCard
        fonts={page.data.fonts}
        onPick={(script, family) => saveFont.mutate({ script, family })}
      />
    </div>
  )
}
