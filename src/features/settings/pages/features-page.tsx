import { useTranslation } from 'react-i18next'
import { HIDEABLE_ITEMS, type NavAccess } from '@/app/layouts/authenticated/nav-items'
import { FormSection } from '@/shared/components/forms'
import { Switch } from '@/shared/components/ui'
import { useSaveHiddenSections } from '../hooks/use-sections'

export type FeaturesPageProps = {
  /** Sections the owner switched off. */
  hidden: readonly string[]
  /** What the package includes, to mark a section it does not. */
  features: NavAccess['features']
}

/**
 * One switch per optional dashboard section. Off takes it out of the sidebar
 * and nothing else: what it holds stays, and the menu is unaffected.
 */
export function FeaturesPage({ hidden, features }: FeaturesPageProps) {
  const { t } = useTranslation('settings')
  // Section names are the sidebar's own, from `common`.
  const { t: tCommon } = useTranslation()
  const save = useSaveHiddenSections()

  const toggle = (key: string, visible: boolean) => {
    const next = visible ? hidden.filter((section) => section !== key) : [...hidden, key]
    save.mutate(next)
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h2 className="font-display text-[19px] leading-tight">{t('features.title')}</h2>
        <p className="mt-1 max-w-[62ch] text-[13px] leading-snug text-[var(--muted)]">
          {t('features.description')}
        </p>
      </div>

      <FormSection title={t('features.listTitle')} className="max-w-[720px]">
        <ul className="flex flex-col divide-y-[0.5px] divide-[var(--line-2)]">
          {HIDEABLE_ITEMS.map((item) => {
            const Icon = item.icon
            const label = tCommon(item.labelKey)
            const visible = !hidden.includes(item.key)
            const locked = item.requiresFeature !== undefined && !features[item.requiresFeature]
            const labelId = `feature-${item.key}`

            return (
              <li key={item.key} className="flex items-start gap-3 py-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[var(--hover-wash)] text-[var(--muted)]">
                  <Icon aria-hidden className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p id={labelId} className="text-[14px] font-medium">
                    {label}
                    {locked ? (
                      <span className="ms-2 text-[12px] font-normal text-[var(--faint)]">
                        {t('features.notOnPackage')}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[12.5px] leading-snug text-[var(--muted)]">
                    {t(
                      `features.sections.${item.key as 'analytics' | 'orders' | 'qr' | 'social-links'}`,
                    )}
                  </p>
                  {item.key === 'orders' && !visible ? (
                    <p className="mt-1 text-[12.5px] leading-snug text-[var(--status-warn)]">
                      {t('features.ordersNote')}
                    </p>
                  ) : null}
                </div>
                <Switch
                  checked={visible}
                  onChange={(on) => toggle(item.key, on)}
                  aria-label={t('features.show', { section: label })}
                  className="mt-1.5"
                />
              </li>
            )
          })}
        </ul>
      </FormSection>
    </div>
  )
}
