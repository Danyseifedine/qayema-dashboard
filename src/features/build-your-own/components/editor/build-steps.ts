import type { FieldPath } from 'react-hook-form'
import type { BuildFormInput } from '@/features/build-your-own/schemas/build.schema'

/** The editor's steps, in order, each with the form fields it holds. */
export const STEPS = [
  { id: 'kind', fields: ['kind'] },
  { id: 'choices', fields: ['source', 'category_id', 'choices'] },
  { id: 'sizes', fields: ['shape', 'parts', 'dish_prices'] },
  { id: 'menu', fields: ['dish', 'name'] },
  { id: 'review', fields: [] },
] as const satisfies readonly { id: string; fields: readonly FieldPath<BuildFormInput>[] }[]

export type StepId = (typeof STEPS)[number]['id']

export const LAST_STEP = STEPS.length - 1

/** The sizes step: where every part price is set, an own row's included. */
const SIZES = STEPS.findIndex((step) => step.id === 'sizes')

/**
 * The step holding a field, by its name or a path under it ("name.en",
 * "choices.0.price"); a part price, even an own row's, is the sizes step's.
 * Null for a name no step holds.
 */
export function stepOf(name: string): number | null {
  if (/(^|\.)part_prices(\.|$)/.test(name)) return SIZES
  const root = name.split('.')[0]!
  const index = STEPS.findIndex((step) => (step.fields as readonly string[]).includes(root))
  return index === -1 ? null : index
}

/** The first step, in order, among the names that have an error. */
export function firstStepWithError(names: readonly string[]): number | null {
  const steps = names.map(stepOf).filter((step): step is number => step !== null)
  return steps.length === 0 ? null : Math.min(...steps)
}

/**
 * Every path with an error in a form's errors, nested ones in full
 * ("choices.0.part_prices.2"), so a part price counts for its own step.
 */
export function errorPaths(errors: unknown, prefix = ''): string[] {
  const paths: string[] = []
  if (!errors || typeof errors !== 'object') return paths
  for (const [key, value] of Object.entries(errors)) {
    if (key === 'ref' || !value || typeof value !== 'object') continue
    const path = prefix === '' ? key : `${prefix}.${key}`
    if (typeof (value as { message?: unknown }).message === 'string') paths.push(path)
    paths.push(...errorPaths(value, path))
  }
  return paths
}
