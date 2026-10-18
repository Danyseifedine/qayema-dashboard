import { IconChefHat, IconChevronRight } from '@tabler/icons-react'
import { useId, type ReactNode } from 'react'
import { useWatch, type UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Switch } from '@/shared/components/ui'
import { cn } from '@/shared/utils/dom/cn'
import type {
  CardTheme,
  CornerStyle,
  DotStyle,
  EyeStyle,
  QrFormValues,
} from '@/features/qr/schemas/qr.schema'

/** The sheets a tile opens, each holding every choice of its kind. */
export type StudioSheet = 'colors' | 'shapes' | 'logo'

type Preset = 'square' | 'dots' | 'round'

/** Three looks a tap away; the Shapes sheet mixes the parts freely. */
const PRESETS: Record<
  Preset,
  { dot_style: DotStyle; corner_style: CornerStyle; eye_style: EyeStyle }
> = {
  square: { dot_style: 'square', corner_style: 'square', eye_style: 'square' },
  dots: { dot_style: 'dots', corner_style: 'extra-rounded', eye_style: 'dot' },
  round: { dot_style: 'rounded', corner_style: 'dot', eye_style: 'dot' },
}

const PRESET_ICONS: Record<Preset, ReactNode> = {
  square: (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor">
      <rect x={4} y={4} width={16} height={16} strokeWidth={2.2} />
      <rect x={9} y={9} width={6} height={6} fill="currentColor" stroke="none" />
    </svg>
  ),
  dots: (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor">
      {[6, 12, 18].flatMap((y) =>
        [6, 12, 18].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r={2.1} />),
      )}
    </svg>
  ),
  round: (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor">
      <circle cx={12} cy={12} r={8} strokeWidth={2.2} />
    </svg>
  ),
}

/** What each printable card is painted with; "brand" is the menu's own colour. */
const CARD_FILLS: Record<Exclude<CardTheme, 'brand'>, string> = {
  light: '#FFFFFF',
  dark: '#111418',
}

const TILE =
  'flex min-w-0 flex-col gap-2.5 rounded-tile border-[0.5px] border-[var(--line)] p-2.5 sm:p-3'

export type CustomiseTilesProps = {
  form: UseFormReturn<QrFormValues>
  /** Whether the restaurant has a logo to place, and the picture of it. */
  logoUrl: string | null
  /** The menu's main colour, so "Your colour" shows the real one. */
  brandColor: string
  onOpen: (sheet: StudioSheet) => void
}

/**
 * The look at a glance, in four tiles: the colours, the shapes with three
 * quick looks, the logo with its switch, and the card's colour. A tile with
 * a chevron opens every choice of its kind.
 */
export function CustomiseTiles({ form, logoUrl, brandColor, onOpen }: CustomiseTilesProps) {
  const { t } = useTranslation('qr')
  const { control, setValue } = form
  const [dotColor, background, cornerColor, dotStyle, cornerStyle, eyeStyle, logo, cardTheme] =
    useWatch({
      control,
      name: [
        'dot_color',
        'background',
        'corner_color',
        'dot_style',
        'corner_style',
        'eye_style',
        'logo',
        'card_theme',
      ],
    })
  const noLogoId = useId()
  const cardId = useId()

  const change = { shouldDirty: true, shouldValidate: true }

  const preset = (Object.keys(PRESETS) as Preset[]).find(
    (key) =>
      PRESETS[key].dot_style === dotStyle &&
      PRESETS[key].corner_style === cornerStyle &&
      PRESETS[key].eye_style === eyeStyle,
  )

  const cardFills: Record<CardTheme, string> = { ...CARD_FILLS, brand: brandColor }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <button
        type="button"
        onClick={() => onOpen('colors')}
        className={cn(TILE, 'text-start transition-colors hover:bg-[var(--hover-wash)] focus-ring')}
      >
        <TileLabel more>{t('page.colors')}</TileLabel>
        <span aria-hidden className="flex gap-1.5">
          {Object.entries({ dots: dotColor, background, corners: cornerColor }).map(
            ([part, color]) => (
              <span
                key={part}
                className="size-7 rounded-full border-[0.5px] border-[var(--line)]"
                style={{ background: color }}
              />
            ),
          )}
        </span>
      </button>

      <div className={TILE}>
        <button type="button" onClick={() => onOpen('shapes')} className="text-start focus-ring">
          <TileLabel more>{t('page.shapes')}</TileLabel>
        </button>
        <div role="group" aria-label={t('presets.label')} className="flex gap-1.5">
          {(Object.keys(PRESETS) as Preset[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={preset === key}
              aria-label={t(`presets.${key}`)}
              onClick={() => {
                const look = PRESETS[key]
                setValue('dot_style', look.dot_style, change)
                setValue('corner_style', look.corner_style, change)
                setValue('eye_style', look.eye_style, change)
              }}
              className={cn(
                'grid size-8 place-items-center rounded-[9px] border-[0.5px] transition-colors',
                preset === key
                  ? 'border-[var(--accent-border)] bg-accent-wash text-accent shadow-[inset_0_0_0_1px_var(--accent-border)]'
                  : 'border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]',
                'focus-ring',
              )}
            >
              {PRESET_ICONS[key]}
            </button>
          ))}
        </div>
      </div>

      <div className={TILE}>
        <button
          type="button"
          onClick={() => onOpen('logo')}
          disabled={!logoUrl || !logo}
          className="text-start focus-ring disabled:cursor-default"
        >
          <TileLabel more={Boolean(logoUrl) && logo}>{t('page.logo')}</TileLabel>
        </button>
        <div className="flex items-center justify-between gap-2">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              className="size-8 rounded-full border-[0.5px] border-[var(--line)] object-cover"
            />
          ) : (
            <IconChefHat aria-hidden className="size-7 text-accent" stroke={1.5} />
          )}
          <Switch
            checked={logo}
            onChange={(checked) => setValue('logo', checked, change)}
            disabled={!logoUrl}
            aria-label={t('logo.label')}
            aria-describedby={logoUrl ? undefined : noLogoId}
          />
        </div>
        {logoUrl ? null : (
          <p id={noLogoId} className="text-[11px] leading-snug text-[var(--muted)]">
            {t('logo.noLogo')}
          </p>
        )}
      </div>

      <div className={TILE}>
        <span id={cardId}>
          <TileLabel>{t('page.card')}</TileLabel>
        </span>
        <div role="radiogroup" aria-labelledby={cardId} className="flex gap-1.5">
          {(['light', 'dark', 'brand'] as const).map((theme) => (
            <button
              key={theme}
              type="button"
              role="radio"
              aria-checked={cardTheme === theme}
              aria-label={t(`card.${theme}`)}
              onClick={() => setValue('card_theme', theme, change)}
              className={cn(
                'size-8 rounded-[9px] border-[0.5px] border-[var(--line)] transition-shadow',
                cardTheme === theme &&
                  'shadow-[0_0_0_2px_var(--bg),0_0_0_3.5px_var(--accent-text)]',
                'focus-ring',
              )}
              style={{ background: cardFills[theme] }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function TileLabel({ more = false, children }: { more?: boolean; children: ReactNode }) {
  return (
    <span className="flex items-center justify-between gap-1 text-[13px] text-[var(--text)]">
      <span className="truncate">{children}</span>
      {more ? (
        <IconChevronRight
          aria-hidden
          className="size-3.5 shrink-0 text-[var(--faint)] rtl:rotate-180"
        />
      ) : null}
    </span>
  )
}
