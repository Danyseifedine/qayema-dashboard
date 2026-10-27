import { IconCheck } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { useController, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { HelperText } from '@/shared/components/ui'
import { cn } from '@/shared/utils/dom/cn'
import {
  AD_SECONDS,
  BANNER_SHAPES,
  DELAYS,
  PLACEMENTS,
  POPUP_SHAPES,
  SHOW_AGAIN,
  type Offer,
  type OfferSlots,
} from '@/features/offers/schemas/offer.schema'
import {
  Part,
  SegmentedField,
  type OfferControl,
} from '@/features/offers/components/editor/editor-parts'
import { OfferPreview, type CardShape } from '@/features/offers/components/editor/offer-preview'
import type { OfferLook } from '@/features/offers/hooks/use-offer-look'
import { ratioOf } from '@/features/offers/hooks/use-picture-size'
import {
  PlacementPicker,
  type PlacementRoom,
} from '@/features/offers/components/editor/placement-picker'
import { pictureFit } from '@/features/offers/utils/picture-fit'
import { hasRoom, slotUse } from '@/features/offers/utils/slots'

/** The other offers and the package's slots, to know which places are full. */
type SlotsContext = { offers: readonly Offer[]; slots: OfferSlots; offer: Offer | null }

/**
 * Where the offer shows and in what shape: a banner is a rectangle or a
 * square, a pop-up a square or tall, each choice drawn with the owner's own
 * picture cut to it, with a word when the picture would be cut a lot; an
 * ad is always a rectangle, so it is only shown. Each place says how many
 * of the package's slots are in use. Then, for a pop-up and an ad, how
 * often and how long; with both, the ad waits from the pop-up closing.
 */
export function WhereStep({
  control,
  look,
  slots,
}: {
  control: OfferControl
  look: OfferLook
  /** Null while the list is not in hand: no place is closed then (the server still checks). */
  slots: SlotsContext | null
}) {
  const { t } = useTranslation('offers')
  const [placements, active] = useWatch({ control, name: ['placements', 'is_active'] })
  const popup = placements.includes('popup')
  const ad = placements.includes('ad')
  const delays = DELAYS.map((value) => ({ value, label: t('editor.inSeconds', { count: value }) }))
  const ratio = ratioOf(look.pictureSize)

  // A paused offer takes no slot, so only one to be switched on is kept out.
  const room: PlacementRoom = {}
  if (slots) {
    for (const placement of PLACEMENTS) {
      room[placement] = {
        use: slotUse(slots.offers, slots.slots, placement),
        full: active && !hasRoom(slots.offers, slots.slots, placement, slots.offer),
      }
    }
  }

  return (
    <>
      <Part title={t('editor.where')}>
        <PlacementPicker control={control} room={room} />
      </Part>

      {placements.length > 0 ? (
        <Part title={t('editor.shape')}>
          <div className="flex flex-col gap-4 pt-1">
            {placements.includes('banner') ? (
              <ShapeField
                control={control}
                name="banner_shape"
                label={t('editor.bannerShape')}
                look={look}
                ratio={ratio}
              />
            ) : null}
            {placements.includes('popup') ? (
              <ShapeField
                control={control}
                name="popup_shape"
                label={t('editor.popupShape')}
                look={look}
                ratio={ratio}
              />
            ) : null}
            {placements.includes('ad') ? (
              <div className="flex flex-col gap-1.5">
                <ShapeNote
                  label={t('placements.ad.name')}
                  note={t('editor.adShape')}
                  preview={<OfferPreview look={look} shape="rectangle" size="mini" />}
                />
                <CropNote ratio={ratio} shape="rectangle" choices={['rectangle']} look={look} />
              </div>
            ) : null}
          </div>
        </Part>
      ) : null}

      {popup || ad ? (
        <Part
          title={
            popup && ad ? t('editor.popupAndAd') : t(`placements.${popup ? 'popup' : 'ad'}.name`)
          }
        >
          <SegmentedField
            control={control}
            name="show_again"
            label={t('editor.showAgain')}
            options={SHOW_AGAIN.map((value) => ({
              value,
              label: t(`editor.showAgainOptions.${value}`),
            }))}
          />
          {popup ? (
            <SegmentedField
              control={control}
              name="delay_seconds"
              label={ad ? t('editor.popupDelay') : t('editor.delay')}
              options={delays}
            />
          ) : null}
          {ad ? (
            <>
              {/* With a pop-up, the ad's wait starts when the pop-up is closed. */}
              <SegmentedField
                control={control}
                name="ad_delay_seconds"
                label={popup ? t('editor.adAfterPopup') : t('editor.delay')}
                options={delays}
              />
              <SegmentedField
                control={control}
                name="ad_seconds"
                label={popup ? t('editor.adStays') : t('editor.seconds')}
                options={AD_SECONDS.map((value) => ({
                  value,
                  label: t('editor.inSeconds', { count: value }),
                }))}
              />
            </>
          ) : null}
        </Part>
      ) : null}
    </>
  )
}

/** A wide shape fills the tile's width; the others its height. */
const FIT: Record<CardShape, string> = {
  rectangle: 'w-full max-h-full',
  square: 'h-full max-w-full',
  tall: 'h-full max-w-full',
}

/** The shapes to pick from for a banner or a pop-up, each drawn with the offer. */
function ShapeField({
  control,
  name,
  label,
  look,
  ratio,
}: {
  control: OfferControl
  name: 'banner_shape' | 'popup_shape'
  label: string
  look: OfferLook
  /** The picture's width over height, once known. */
  ratio: number | null
}) {
  const { t } = useTranslation('offers')
  const { field } = useController({ control, name })
  const shapes: readonly CardShape[] = name === 'banner_shape' ? BANNER_SHAPES : POPUP_SHAPES

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[13px] font-medium text-[var(--text)]">{label}</p>
      <div role="group" aria-label={label} className="grid grid-cols-2 gap-2">
        {shapes.map((shape) => {
          const on = field.value === shape
          return (
            <button
              key={shape}
              type="button"
              aria-pressed={on}
              onClick={() => field.onChange(shape)}
              className={cn(
                'flex min-w-0 flex-col gap-2 rounded-tile border-[0.5px] p-2.5 text-start transition-colors',
                'focus-ring',
                on
                  ? 'border-accent-border bg-accent-wash'
                  : 'border-[var(--line)] hover:border-[var(--line-strong)]',
              )}
            >
              <span className="flex h-[104px] items-center justify-center">
                <OfferPreview look={look} shape={shape} size="mini" className={FIT[shape]} />
              </span>
              <span className="flex flex-col">
                <span className="flex items-center gap-1.5 text-[13.5px] font-medium">
                  {t(`shapes.${shape}.name`)}
                  {on ? <IconCheck aria-hidden className="size-3.5 text-accent" /> : null}
                </span>
                <span className="text-[12px] leading-snug text-[var(--muted)]">
                  {t(`shapes.${shape}.hint`)}
                </span>
              </span>
            </button>
          )
        })}
      </div>
      <CropNote ratio={ratio} shape={field.value} choices={shapes} look={look} />
    </div>
  )
}

/**
 * A word when the picture is far from the shape, so much of it is cut away
 * (more so for a picture alone, whose words may go with it), and which
 * shape would fit it better.
 */
function CropNote({
  ratio,
  shape,
  choices,
  look,
}: {
  ratio: number | null
  shape: CardShape
  choices: readonly CardShape[]
  look: OfferLook
}) {
  const { t } = useTranslation('offers')
  const alone = !look.showText
  const fit = look.imageUrl ? pictureFit(ratio, shape, choices, alone) : null
  if (fit === null) return null

  return (
    <HelperText tone="warning" role="status">
      {t(`crop.${fit.mode}.${fit.way}`)}
      {fit.better ? ` ${t('crop.better', { shape: t(`shapes.${fit.better}.name`) })}` : null}
    </HelperText>
  )
}

/** A placement with only one shape: shown, with a line saying so. */
function ShapeNote({ label, note, preview }: { label: string; note: string; preview: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-tile border-[0.5px] border-[var(--line)] p-2.5">
      <span className="w-[112px] shrink-0">{preview}</span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[13.5px] font-medium">{label}</span>
        <span className="text-[12px] leading-snug text-[var(--muted)]">{note}</span>
      </span>
    </div>
  )
}
