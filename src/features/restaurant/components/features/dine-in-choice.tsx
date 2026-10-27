import { useTranslation } from 'react-i18next'
import type { AuthRestaurant } from '@/features/auth'
import { Field } from '@/shared/components/forms'
import { Alert, Button } from '@/shared/components/ui'
import { AskGuestsFor } from '@/features/restaurant/components/features/ask-guests-for'
import { OrderWays } from '@/features/restaurant/components/features/order-ways'
import { useSaveDineIn } from '@/features/restaurant/hooks/use-ordering-save'

type DineInChoiceProps = {
  ordering: AuthRestaurant['ordering']
  /** The package has table orders in the menu (`dine_in`). */
  menuIncluded: boolean
  /** The package has table orders on WhatsApp (`dine_in_whatsapp`). */
  whatsappIncluded: boolean
  onOpenRestaurant: () => void
}

/**
 * How orders at the table come in, apart from delivery and pickup: on the
 * Table orders page (followed by the guest, with a sound here) or on
 * WhatsApp with the table's name on top. Each way is a package switch of
 * its own: one the package lacks is not shown.
 * WhatsApp needs the restaurant's number; without one the server keeps them
 * here (or, with WhatsApp the only way, takes none), and this says so.
 */
export function DineInChoice({
  ordering,
  menuIncluded,
  whatsappIncluded,
  onOpenRestaurant,
}: DineInChoiceProps) {
  const { t } = useTranslation('features')
  const save = useSaveDineIn()
  const mode = ordering.dine_in
  const noNumber = !ordering.whatsapp_number

  return (
    <div className="mt-2.5 grid gap-3 inset-tile p-3">
      <Field
        label={t('dine_in.modeLabel')}
        hint={t(mode === 'whatsapp' ? 'dine_in.whatsappHint' : 'dine_in.dashboardHint')}
        className="pt-0"
      >
        {({ id }) => (
          <OrderWays
            id={id}
            label={t('dine_in.modeLabel')}
            value={mode}
            onChange={(next) => {
              if (next !== mode) {
                save.mutate(next)
              }
            }}
            options={[
              ...(menuIncluded ? [{ value: 'menu' as const, label: t('orders.dashboard') }] : []),
              ...(whatsappIncluded
                ? [
                    {
                      value: 'whatsapp' as const,
                      label: t('orders.whatsapp'),
                      // Chosen before the number went: it stays, so the owner
                      // can move back to the dashboard from it.
                      disabled: noNumber && mode !== 'whatsapp',
                    },
                  ]
                : []),
            ]}
          />
        )}
      </Field>
      {noNumber ? (
        <Alert variant="warning" size="sm">
          {t(mode === 'whatsapp' ? 'dine_in.noNumber' : 'dine_in.needsNumber')}{' '}
          <Button
            variant="link"
            size="sm"
            onClick={onOpenRestaurant}
            className="h-auto px-0 align-baseline text-[12.5px] font-medium"
          >
            {t('dine_in.addNumber')}
          </Button>
        </Alert>
      ) : null}
      {mode === 'whatsapp' ? <AskGuestsFor set="table" fields={ordering.whatsapp_fields} /> : null}
    </div>
  )
}
