import { useTranslation } from 'react-i18next'
import { Money } from '@/shared/components/data-display'
import { nameOr } from '@/shared/utils/string/translated'
import { addonGroupRule, type AddonGroup } from '@/features/menu/dishes/schemas/dish-choices.schema'

export type AddonGroupsListProps = {
  groups: AddonGroup[]
  /** The language names are shown in. */
  language: string
  currency: string
}

/**
 * A dish's add-on groups as its POS made them: each group's name, what it
 * asks guests to pick and its add-ons with their prices. Shown, not edited.
 */
export function AddonGroupsList({ groups, language, currency }: AddonGroupsListProps) {
  const { t } = useTranslation('menu')

  if (groups.length === 0) return null

  return (
    <section aria-labelledby="addon-groups-title" className="flex flex-col gap-3" data-addon-groups>
      <div>
        <h4 id="addon-groups-title" className="text-[13px] font-medium text-[var(--text)]">
          {t('choices.groups.title')}
        </h4>
        <p className="text-[12px] text-[var(--muted)]">{t('choices.groups.hint')}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {groups.map((group) => (
          <li
            key={group.id}
            className="rounded-[12px] border-[0.5px] border-[var(--line)] px-3 py-2"
            data-addon-group={group.id}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-[13px] font-medium">
                {nameOr(group.name, language, t('choices.groups.untitled'))}
              </span>
              <span className="shrink-0 text-[12px] text-[var(--muted)]">
                {t(...addonGroupRule(group))}
              </span>
            </div>
            <ul className="mt-1 flex flex-col">
              {group.addons.map((addon) => {
                const price = Number(addon.price)
                return (
                  <li
                    key={addon.id}
                    className="flex justify-between gap-3 text-[12.5px] text-[var(--muted)]"
                  >
                    <span className="min-w-0 truncate">{nameOr(addon.name, language, '')}</span>
                    {price > 0 ? (
                      <Money amount={price} currency={currency} prefix="+" />
                    ) : (
                      <span>{t('choices.free')}</span>
                    )}
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  )
}
