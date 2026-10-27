import { IconChefHat, IconChevronDown } from '@tabler/icons-react'
import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Money } from '@/shared/components/data-display'
import { categoryIcon } from '@/features/menu'
import { FilterChips } from '@/shared/components/ui'
import { BuildPicture } from '@/features/build-your-own/components/editor/build-picture'
import { buildExample, type ExampleChoice } from '@/features/build-your-own/schemas/build.schema'
import { partName, sizeLabel } from '@/features/build-your-own/utils/build-labels'
import {
  partPriceCents,
  shareCents,
  type BuildShape,
} from '@/features/build-your-own/utils/build-price'

export type BuildPreviewProps = {
  /** The dish's name in the menu's language, also the title above the parts. */
  dishName: string
  /** Its icon's key; null for none. */
  icon: string | null
  shape: BuildShape
  parts: readonly number[]
  choices: readonly ExampleChoice[]
  currency: string
}

/**
 * What a guest sees when they open the dish, drawn small, like the menu's
 * dish sheet: its icon and name, its sizes as pills (a tap shows that size),
 * the pizza cut that way, one picker per part filled with the first two
 * choices in turn, and the price that comes to.
 */
export function BuildPreview({
  dishName,
  icon,
  shape,
  parts,
  choices,
  currency,
}: BuildPreviewProps) {
  const { t } = useTranslation('build-your-own')
  const counts = [...parts].sort((a, b) => a - b)
  const [picked, setPicked] = useState<number | null>(null)
  const count = picked !== null && counts.includes(picked) ? picked : undefined
  const example = buildExample({ shape, parts: counts }, choices, count)
  // The review comes after a size is picked, so there is always a first one.
  const shown = example?.count ?? counts[0]!
  const Icon = categoryIcon(icon) ?? IconChefHat

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-3 rounded-card border-[0.5px] border-[var(--line)] bg-[var(--bg)] p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-tile bg-accent-wash">
          <Icon aria-hidden className="size-6" stroke={1.8} />
        </span>
        <p className="min-w-0 flex-1 font-display text-[19px] leading-tight">{dishName}</p>
        <BuildPicture shape={shape} count={shown} className="size-12" />
      </div>

      {counts.length > 1 ? (
        <FilterChips
          label={t('review.sizes')}
          value={shown}
          onChange={setPicked}
          chips={counts.map((value) => ({ value, label: sizeLabel(t, shape, value) }))}
        />
      ) : null}

      {example ? (
        <ol className="flex flex-col gap-1.5">
          {[...example.names.entries()].map(([index, choice]) => {
            const pick = choices[index % Math.min(2, choices.length)]!
            const own = shape === 'split' ? partPriceCents(pick.part_prices, shown) : null
            const cents =
              shape === 'pieces' || shown === 1
                ? Math.round(pick.price * 100)
                : (own ?? shareCents(pick.price, shown))
            return (
              <li
                key={index}
                className="flex items-center justify-between gap-2 rounded-field border-[0.5px] border-[var(--line-strong)] px-3 py-2 text-[13px]"
              >
                <span className="text-[var(--muted)]">
                  {shape === 'split' && shown > 1
                    ? partName(t, shown)
                    : t('review.part', { number: index + 1 })}
                </span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate">{choice}</span>
                  <Money amount={cents / 100} currency={currency} className="text-[var(--muted)]" />
                  <IconChevronDown aria-hidden className="size-4 shrink-0 text-[var(--faint)]" />
                </span>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="text-[13px] text-[var(--muted)]">{t('review.nothingYet')}</p>
      )}

      {example ? (
        <p className="flex items-center justify-between rounded-control bg-gold px-4 py-2.5 text-[14px] font-semibold text-ink">
          <Trans
            t={t}
            i18nKey="review.add"
            components={{
              price: <Money amount={example.cents / 100} currency={currency} />,
            }}
          />
        </p>
      ) : null}
    </div>
  )
}
