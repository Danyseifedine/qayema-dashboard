import type { FieldPath } from 'react-hook-form'
import type { OfferFormValues } from '@/features/offers/schemas/offer.schema'

/** The editor's steps, in order, each with the form fields it holds. */
export const STEPS = [
  { id: 'content', fields: ['image', 'show_text', 'title', 'description'] },
  {
    id: 'where',
    fields: [
      'placements',
      'banner_shape',
      'popup_shape',
      'show_again',
      'delay_seconds',
      'ad_delay_seconds',
      'ad_seconds',
    ],
  },
  {
    id: 'tap',
    fields: [
      'gives',
      'deal',
      'action',
      'action_url',
      'discount_type',
      'discount_value',
      'dish_ids',
    ],
  },
  {
    id: 'when',
    fields: [
      'when',
      'starts_on',
      'starts_time',
      'ends_on',
      'ends_time',
      'repeat',
      'weekdays',
      'month_days',
      'all_day',
      'time_windows',
    ],
  },
  { id: 'review', fields: ['is_active'] },
] as const satisfies readonly { id: string; fields: readonly FieldPath<OfferFormValues>[] }[]

export type StepId = (typeof STEPS)[number]['id']

export const LAST_STEP = STEPS.length - 1

/**
 * The step holding a field, by its name or a path under it ("title.en",
 * "time_windows.0.from"); the server's names for the same things count too.
 * Null for a name no step holds.
 */
export function stepOf(name: string): number | null {
  const root = SERVER_NAMES[name.split('.')[0]!] ?? name.split('.')[0]!
  const index = STEPS.findIndex((step) => (step.fields as readonly string[]).includes(root))
  return index === -1 ? null : index
}

/** The API's field names that the form calls otherwise (StoreOfferRequest). */
export const SERVER_NAMES: Record<string, FieldPath<OfferFormValues>> = {
  image_key: 'image',
  delete_image: 'image',
  starts_at: 'starts_on',
  ends_at: 'ends_on',
  // A deal refused whole (a discount beside it) is said under the choice.
  deal: 'gives',
  'deal.image_key': 'deal.image',
}

/** The first step, in order, among the names that have an error. */
export function firstStepWithError(names: readonly string[]): number | null {
  const steps = names.map(stepOf).filter((step): step is number => step !== null)
  return steps.length === 0 ? null : Math.min(...steps)
}
