import { IconLanguage } from '@tabler/icons-react'
import { useWatch, type FieldPath, type UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { AiButton } from '@/shared/components/forms/translatable/writing-help-buttons'
import {
  useTranslateMany,
  useTranslatingMany,
  useWritingHelp,
} from '@/shared/hooks/use-writing-help'
import { piecesOf } from '@/shared/utils/string/missing-translations'
import type { DishFormInput, DishFormValues } from '@/features/menu/dishes/schemas/dish.schema'
import { missingChoiceTranslations } from '@/features/menu/dishes/utils/dish-translations'

export type TranslateChoicesButtonProps = {
  form: UseFormReturn<DishFormInput, unknown, DishFormValues>
  languages: readonly string[]
  /** The language the names went into, so its tab can open to show them. */
  onTranslated: (language: string) => void
}

/**
 * One small "Translate" beside the variants' and add-ons' language tabs:
 * every name written in one language only goes into the other, in one AI
 * use. Only while the writing help is on and the menu has two languages.
 * Nothing is saved until the dish is (which translates what is left too).
 */
export function TranslateChoicesButton({
  form,
  languages,
  onTranslated,
}: TranslateChoicesButtonProps) {
  const { t } = useTranslation('menu')
  const { uses } = useWritingHelp()
  const translate = useTranslateMany()
  // A save filling in the dish's other language runs one too: one at a time.
  const translating = useTranslatingMany()
  const [variants, addons] = useWatch({ control: form.control, name: ['variants', 'addons'] })

  if (uses === null || languages.length < 2) return null

  const missing = missingChoiceTranslations({ variants, addons }, languages)

  return (
    <AiButton
      label={t('choices.translate')}
      icon={<IconLanguage size={16} aria-hidden />}
      action="translation"
      loading={translate.isPending}
      busy={translating && !translate.isPending}
      blocked={missing.length === 0 ? t('choices.nothingToTranslate') : null}
      onClick={() =>
        translate.mutate(piecesOf(missing), {
          // One answer a piece, in order (the server holds it to that).
          onSuccess: (texts) => {
            texts.forEach((text, index) =>
              form.setValue(missing[index]!.path as FieldPath<DishFormInput>, text, {
                shouldDirty: true,
              }),
            )
            // The button is off with nothing missing, so there is a first.
            onTranslated(missing[0]!.to)
          },
        })
      }
    />
  )
}
