import { useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { MENU_TEXT_LIMITS } from '@/shared/constants/menu-text-limits'
import { useMenuLanguages } from '@/features/auth'
import { ImageField, REMOVED_IMAGE } from '@/features/uploads'
import { SwitchField, TranslatableTextField } from '@/shared/components/forms'
import { HelperText } from '@/shared/components/ui'
import type { OfferControl } from '@/features/offers/components/editor/editor-parts'
import { usePictureSize } from '@/features/offers/hooks/use-picture-size'
import { tooSmall } from '@/features/offers/utils/picture-fit'

/**
 * The picture first (it may already say everything; a word if it is too
 * small to look sharp), then whether to write a title and text on it, and
 * those when it does.
 */
export function ContentStep({
  control,
  savedUrl,
}: {
  control: OfferControl
  savedUrl: string | null
}) {
  const { t } = useTranslation('offers')
  const languages = useMenuLanguages()
  const [showText, image] = useWatch({ control, name: ['show_text', 'image'] })
  const size = usePictureSize(image === REMOVED_IMAGE ? null : (image?.previewUrl ?? savedUrl))

  return (
    <div className="flex flex-col gap-1">
      <ImageField
        control={control}
        name="image"
        label={t('editor.photo')}
        optionalText={showText ? t('editor.optional') : undefined}
        context="offer"
        aspect="wide"
        currentUrl={savedUrl}
        hint={showText ? t('editor.photoHint') : t('editor.photoOnlyHint')}
      />
      {size !== null && tooSmall(size) ? (
        <HelperText tone="warning" role="status">
          {t('editor.tooSmall', size)}
        </HelperText>
      ) : null}
      <SwitchField
        control={control}
        name="show_text"
        label={t('editor.showText')}
        description={t('editor.showTextDescription')}
      />
      {showText ? (
        <>
          <TranslatableTextField
            control={control}
            name="title"
            languages={languages}
            label={t('editor.title')}
            required
            maxLength={MENU_TEXT_LIMITS.offerTitle}
            placeholder={{ en: 'Happy hour', ar: 'ساعة سعيدة' }}
          />
          <TranslatableTextField
            control={control}
            name="description"
            languages={languages}
            label={t('editor.description')}
            optionalText={t('editor.optional')}
            multiline
            rows={2}
            maxLength={MENU_TEXT_LIMITS.offerDescription}
            placeholder={{
              en: 'Two drinks for the price of one, 5 to 7 PM.',
              ar: 'مشروبان بسعر واحد، من 5 إلى 7 مساءً.',
            }}
          />
        </>
      ) : null}
    </div>
  )
}
