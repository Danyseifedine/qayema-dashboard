import { useTranslation } from 'react-i18next'
import type { AskLevel, WhatsAppFields } from '@/features/auth'
import { Segmented } from '@/shared/components/ui'
import { useSaveWhatsAppFields } from '@/features/restaurant/hooks/use-ordering-save'

const ASK_LEVELS: readonly AskLevel[] = ['off', 'optional', 'required']

type AskField = keyof WhatsAppFields['away']

type AskGuestsForProps = { set: keyof WhatsAppFields; fields: WhatsAppFields }

/**
 * What a WhatsApp order asks the guest for before WhatsApp opens: `away`
 * (delivery and pickup) has a name, a phone and a delivery address, `table`
 * a name and a phone. Each is off, optional or required, and a change saves
 * the whole set with that one value changed.
 */
export function AskGuestsFor({ set, fields }: AskGuestsForProps) {
  const { t } = useTranslation('features')
  const save = useSaveWhatsAppFields()
  // The table's set has no address; it is never shown for it.
  const current: Record<AskField, AskLevel> = { address: 'off', ...fields[set] }
  const keys: readonly AskField[] =
    set === 'away' ? ['name', 'phone', 'address'] : ['name', 'phone']

  const choose = (key: AskField, level: AskLevel) => {
    if (level === current[key]) return
    save.mutate({ ...fields, [set]: { ...fields[set], [key]: level } })
  }

  return (
    <fieldset className="grid gap-3">
      <legend className="pb-2 text-[12.5px] font-medium text-[var(--text)]">
        {t('askFor.label')}
      </legend>
      {keys.map((key) => {
        const label = t(`askFor.fields.${key}`)
        return (
          <div key={key} className="grid gap-1">
            <div className="flex flex-wrap items-center justify-between gap-x-3.5 gap-y-1.5">
              <span className="min-w-0 text-[13px] text-[var(--text)]">{label}</span>
              <Segmented
                size="sm"
                aria-label={t('askFor.what', { field: label })}
                value={current[key]}
                onChange={(level) => choose(key, level)}
                options={ASK_LEVELS.map((level) => ({
                  value: level,
                  label: t(`askFor.levels.${level}`),
                }))}
              />
            </div>
            {key === 'address' ? (
              <span className="text-[11.5px] leading-[1.45] text-[var(--muted)]">
                {t('askFor.addressHint')}
              </span>
            ) : null}
          </div>
        )
      })}
      <p className="text-[11.5px] leading-[1.45] text-[var(--muted)]">{t('askFor.hint')}</p>
    </fieldset>
  )
}
