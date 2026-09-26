import { StatTile } from '@/shared/components/data-display'
import type { AdvancedStats, GuestAction } from '../../schemas/stats.schema'

const ACTIONS: { label: string; keys: GuestAction[]; ordering?: boolean }[] = [
  { label: 'Added to cart', keys: ['dish_add'], ordering: true },
  { label: 'Opened a category', keys: ['category_open'] },
  { label: 'Searched', keys: ['search', 'search_miss'] },
  { label: 'WhatsApp taps', keys: ['whatsapp'] },
  { label: 'Opened the map', keys: ['map'] },
  { label: 'Called you', keys: ['call'] },
  { label: 'Followed a social link', keys: ['social'] },
  { label: 'Changed language', keys: ['language'] },
]

export type GuestActionsProps = {
  actions: AdvancedStats['actions']
  /** Without ordering there is no cart, so its tile would only ever say 0. */
  takesOrders: boolean
}

/** What guests did once the menu was open. */
export function GuestActions({ actions, takesOrders }: GuestActionsProps) {
  return (
    <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {ACTIONS.filter((action) => takesOrders || !action.ordering).map((action) => (
        <StatTile
          key={action.label}
          label={action.label}
          value={action.keys.reduce((sum, key) => sum + actions[key], 0).toLocaleString()}
        />
      ))}
    </dl>
  )
}
