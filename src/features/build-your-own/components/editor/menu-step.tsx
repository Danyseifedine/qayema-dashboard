import { type Control } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { IconPickerField } from '@/features/menu'
import { TranslatableTextField } from '@/shared/components/forms'
import { MENU_TEXT_LIMITS } from '@/shared/constants/menu-text-limits'
import type { BuildFormInput } from '@/features/build-your-own/schemas/build.schema'

export type MenuStepProps = {
  control: Control<BuildFormInput>
  languages: readonly string[]
}

/**
 * The fourth step: the dish guests open above the menu's search, which the
 * build is: its name (also the title above the parts) and its icon.
 */
export function MenuStep({ control, languages }: MenuStepProps) {
  const { t } = useTranslation('build-your-own')

  return (
    <div className="flex flex-col gap-3">
      <TranslatableTextField
        control={control}
        languages={languages}
        name="dish.name"
        label={t('menu.name')}
        required
        maxLength={MENU_TEXT_LIMITS.dishName}
        placeholder={{ en: 'Build your pizza', ar: 'اصنع بيتزاك' }}
      />
      <IconPickerField
        control={control}
        name="dish.icon"
        label={t('menu.icon')}
        hint={t('menu.iconHint')}
        optionalText={t('menu.optional')}
      />
    </div>
  )
}
