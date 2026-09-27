import type { AuthRestaurant } from '@/features/auth/schemas/user.schema'
import type { Dish } from '@/features/menu/dishes/schemas/dish.schema'
import type { Settings } from '@/features/settings/schemas/settings.schema'
import { t } from '@/lib/i18n'

/** A dashboard section a checklist item sends the owner to. */
export type ChecklistTarget = 'settings' | 'categories' | 'dishes' | 'social-links'

export type ChecklistItem = {
  id: string
  label: string
  /** Why it matters, shown while it is still to do. */
  hint: string
  done: boolean
  action: { label: string; target: ChecklistTarget }
}

export type ChecklistInput = {
  settings: Settings
  dishes: Dish[]
  limits: AuthRestaurant['limits']
}

const filled = (value: string | null | undefined) => (value ?? '').trim() !== ''

/**
 * What a guest would miss on this menu, in the order an owner would usually
 * fill it in. Everything here is read from data the dashboard already has.
 */
export function menuChecklist({ settings, dishes, limits }: ChecklistInput): ChecklistItem[] {
  const withoutPhoto = dishes.filter((dish) => dish.image_url === null).length
  const hasHours = Object.values(settings.opening_hours).some((day) => day !== null)
  const add = t('overview:checklist.actions.add')

  return [
    {
      id: 'logo',
      label: t('overview:checklist.items.logo.label'),
      hint: t('overview:checklist.items.logo.hint'),
      done: settings.logo_url !== null,
      action: { label: add, target: 'settings' },
    },
    {
      id: 'cover',
      label: t('overview:checklist.items.cover.label'),
      hint: t('overview:checklist.items.cover.hint'),
      done: settings.cover_url !== null,
      action: { label: add, target: 'settings' },
    },
    {
      id: 'description',
      label: t('overview:checklist.items.description.label'),
      hint: t('overview:checklist.items.description.hint'),
      done: Object.values(settings.description).some(filled),
      action: { label: add, target: 'settings' },
    },
    {
      id: 'hours',
      label: t('overview:checklist.items.hours.label'),
      hint: t('overview:checklist.items.hours.hint'),
      done: hasHours,
      action: { label: add, target: 'settings' },
    },
    {
      id: 'location',
      label: t('overview:checklist.items.location.label'),
      hint: t('overview:checklist.items.location.hint'),
      done: filled(settings.google_maps_url),
      action: { label: add, target: 'settings' },
    },
    {
      id: 'phone',
      label: t('overview:checklist.items.phone.label'),
      hint: t('overview:checklist.items.phone.hint'),
      done: filled(settings.phone),
      action: { label: add, target: 'settings' },
    },
    {
      id: 'categories',
      label: t('overview:checklist.items.categories.label'),
      hint: t('overview:checklist.items.categories.hint'),
      done: limits.categories.used > 0,
      action: { label: add, target: 'categories' },
    },
    {
      id: 'dishes',
      label: t('overview:checklist.items.dishes.label'),
      hint: t('overview:checklist.items.dishes.hint'),
      done: limits.dishes.used > 0,
      action: { label: add, target: 'dishes' },
    },
    {
      id: 'photos',
      label:
        dishes.length === 0
          ? t('overview:checklist.items.photos.label')
          : withoutPhoto === 0
            ? t('overview:checklist.items.photos.allDone')
            : t('overview:checklist.items.photos.missing', { count: withoutPhoto }),
      hint: t('overview:checklist.items.photos.hint'),
      done: dishes.length > 0 && withoutPhoto === 0,
      action: { label: t('overview:checklist.actions.fix'), target: 'dishes' },
    },
    {
      id: 'social',
      label: t('overview:checklist.items.social.label'),
      hint: t('overview:checklist.items.social.hint'),
      done: limits.social_links.used > 0,
      action: { label: add, target: 'social-links' },
    },
  ]
}
