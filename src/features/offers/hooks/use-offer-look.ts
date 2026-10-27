import { useWatch } from 'react-hook-form'
import { REMOVED_IMAGE } from '@/features/uploads'
import type { Locale } from '@/shared/constants/locales'
import { translated } from '@/shared/utils/string/translated'
import type { OfferControl } from '@/features/offers/components/editor/editor-parts'
import { usePictureSize, type PictureSize } from '@/features/offers/hooks/use-picture-size'

/** What a guest would see of the offer being edited. */
export type OfferLook = {
  imageUrl: string | null
  /** The picture's size once loaded, to fit it to each shape as the menu does. */
  pictureSize: PictureSize | null
  showText: boolean
  title: string
  text: string
}

/**
 * The offer being edited, as the previews draw it: its picture and words.
 * Never its discount, which the menu shows on the dishes, not the card.
 */
export function useOfferLook(
  control: OfferControl,
  { savedUrl, locale }: { savedUrl: string | null; locale: Locale },
): OfferLook {
  const [image, showText, title, description] = useWatch({
    control,
    name: ['image', 'show_text', 'title', 'description'],
  })
  const imageUrl = image === REMOVED_IMAGE ? null : (image?.previewUrl ?? savedUrl)
  const pictureSize = usePictureSize(imageUrl)

  return {
    imageUrl,
    pictureSize,
    showText,
    title: translated(title, locale).text,
    text: translated(description, locale).text,
  }
}
