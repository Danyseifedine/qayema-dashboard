import { useTranslation } from 'react-i18next'
import { useWatch, type Control } from 'react-hook-form'
import type { Category, Dish } from '@/features/menu'
import { Money } from '@/shared/components/data-display'
import { Button } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { nameOr } from '@/shared/utils/string/translated'
import { usePreferencesStore } from '@/stores/preferences.store'
import { BuildPreview } from '@/features/build-your-own/components/editor/build-preview'
import { STEPS, type StepId } from '@/features/build-your-own/components/editor/build-steps'
import { choicesOf, type BuildFormInput } from '@/features/build-your-own/schemas/build.schema'
import { partName, sizesSummary } from '@/features/build-your-own/utils/build-labels'
import { partPriceCents } from '@/features/build-your-own/utils/build-price'

export type ReviewStepProps = {
  control: Control<BuildFormInput>
  categories: readonly Category[]
  offered: readonly Dish[]
  currency: string
  locale: Locale
  dishName: (name: Dish['name']) => string
  /** Opens a step, to change what it holds. */
  onEdit: (step: number) => void
}

/**
 * The last step: the build as a guest will meet it, then every choice made
 * on the way, each with the way back to its step.
 */
export function ReviewStep({
  control,
  categories,
  offered,
  currency,
  locale,
  dishName,
  onEdit,
}: ReviewStepProps) {
  const { t } = useTranslation('build-your-own')
  const ui = usePreferencesStore((state) => state.locale)
  const values = useWatch({ control }) as BuildFormInput

  const rowName = (row: BuildFormInput['choices'][number], index: number) =>
    nameOr(row.name, locale, t('choices.rowName', { number: index + 1 }))
  const choices = choicesOf(values, offered, dishName, rowName)
  const counts = values.shape === 'split' ? values.parts.filter((count) => count > 1) : []
  const categoryName = (id: number | null) =>
    nameOr(categories.find((each) => each.id === id)?.name ?? {}, locale, t('card.untitled'))
  const dish = dishName(values.dish.name)

  const rows: { step: StepId; label: string; value: string }[] = [
    {
      step: 'kind',
      label: t('review.kind'),
      // Picked on the first step, which no build passes without one.
      value: t(`kinds.${values.kind!}.name`),
    },
    {
      step: 'choices',
      label: t('review.choices'),
      value:
        values.source === 'category'
          ? t('review.fromCategory', {
              category: categoryName(values.category_id),
              count: offered.length,
            })
          : t('review.ownList', { count: values.choices.length }),
    },
    {
      step: 'sizes',
      label: t('review.sizes'),
      value: sizesSummary(t, values.shape, values.parts, ui),
    },
    { step: 'menu', label: t('review.dish'), value: dish },
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section aria-label={t('review.preview')} className="flex flex-col gap-2">
        <p className="label-caps text-[var(--muted)]">{t('review.preview')}</p>
        <BuildPreview
          dishName={dish}
          icon={values.dish.icon}
          shape={values.shape}
          parts={values.parts}
          choices={choices}
          currency={currency}
        />
      </section>

      <section aria-label={t('review.summary')} className="flex flex-col gap-3">
        <p className="label-caps text-[var(--muted)]">{t('review.summary')}</p>
        <dl className="flex flex-col divide-y-[0.5px] divide-[var(--line)]">
          {rows.map((row) => (
            <div key={row.step} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <dt className="text-[12px] text-[var(--muted)]">{row.label}</dt>
                <dd className="text-[14px]">{row.value}</dd>
              </div>
              <Button
                variant="ghost"
                size="sm"
                aria-label={t('review.editStep', { step: row.label })}
                onClick={() => onEdit(STEPS.findIndex((step) => step.id === row.step))}
              >
                {t('review.edit')}
              </Button>
            </div>
          ))}
        </dl>

        {choices.length > 0 ? (
          <ul aria-label={t('review.everyChoice')} className="flex flex-col gap-1">
            {[...choices.entries()].map(([at, choice]) => (
              <li
                key={at}
                className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-tile bg-[var(--hover-wash)] px-3 py-1.5 text-[13px]"
              >
                <span className="min-w-0">{choice.name}</span>
                <span className="flex flex-wrap items-baseline gap-x-2 text-[var(--muted)]">
                  <Money amount={choice.price} currency={currency} />
                  {counts.flatMap((count) => {
                    const own = partPriceCents(choice.part_prices, count)
                    return own === null
                      ? []
                      : [
                          <span key={count}>
                            {partName(t, count)} <Money amount={own / 100} currency={currency} />
                          </span>,
                        ]
                  })}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  )
}
