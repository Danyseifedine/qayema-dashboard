import { useTranslation } from 'react-i18next'
import { StatTile } from '@/shared/components/data-display'
import type { AdvancedStats, GuestAction } from '../../schemas/stats.schema'

type ActionLabel =
  'dishAdd' | 'categoryOpen' | 'search' | 'whatsapp' | 'map' | 'call' | 'social' | 'language'

const ACTIONS: { label: ActionLabel; keys: GuestAction[]; ordering?: boolean }[] = [
  { label: 'dishAdd', keys: ['dish_add'], ordering: true },
  { label: 'categoryOpen', keys: ['category_open'] },
  { label: 'search', keys: ['search', 'search_miss'] },
  { label: 'whatsapp', keys: ['whatsapp'] },
  { label: 'map', keys: ['map'] },
  { label: 'call', keys: ['call'] },
  { label: 'social', keys: ['social'] },
  { label: 'language', keys: ['language'] },
]

export type GuestActionsProps = {
  actions: AdvancedStats['actions']
  /** Without ordering there is no cart, so its tile would only ever say 0. */
  takesOrders: boolean
}

/**
 * What guests did once the menu was open. A tap is all the menu can see: the
 * call, the chat or the follow that comes after happens in another app.
 */
export function GuestActions({ actions, takesOrders }: GuestActionsProps) {
  const { t } = useTranslation('overview')

  return (
    <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {ACTIONS.filter((action) => takesOrders || !action.ordering).map((action) => (
        <StatTile
          key={action.label}
          label={t(`analytics.actions.labels.${action.label}`)}
          value={action.keys.reduce((sum, key) => sum + actions[key], 0).toLocaleString()}
        />
      ))}
    </dl>
  )
}
