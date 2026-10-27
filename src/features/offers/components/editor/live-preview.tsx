import { useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { OfferControl } from '@/features/offers/components/editor/editor-parts'
import { PreviewFigure } from '@/features/offers/components/editor/offer-preview'
import type { OfferLook } from '@/features/offers/hooks/use-offer-look'

/**
 * Beside the steps on a wide screen: the offer drawn in every place it is
 * set to show, changing as the owner types, picks a picture or a shape.
 */
export function LivePreview({ control, look }: { control: OfferControl; look: OfferLook }) {
  const { t } = useTranslation('offers')
  const [placements, bannerShape, popupShape] = useWatch({
    control,
    name: ['placements', 'banner_shape', 'popup_shape'],
  })

  return (
    <section
      aria-label={t('review.previews')}
      className="glass-card flex flex-col gap-4 rounded-card p-3.5 sm:p-4"
    >
      <h3 className="font-display text-[20px] leading-tight">{t('review.previews')}</h3>
      {placements.map((placement) => (
        <PreviewFigure
          key={placement}
          look={look}
          placement={placement}
          shapes={{ banner_shape: bannerShape, popup_shape: popupShape }}
          caption={t(`placements.${placement}.name`)}
        />
      ))}
    </section>
  )
}
