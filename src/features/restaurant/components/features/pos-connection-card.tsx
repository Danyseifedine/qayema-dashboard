import { zodResolver } from '@hookform/resolvers/zod'
import { IconCashRegister, IconPlugConnected, IconRefresh, IconUnlink } from '@tabler/icons-react'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { TextField } from '@/shared/components/forms'
import { ConfirmDialog, ErrorState, Skeleton } from '@/shared/components/feedback'
import { Alert, Button, SectionCard, Switch } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { usePreferencesStore } from '@/stores/preferences.store'
import { useApiFormErrors } from '@/shared/hooks/use-api-form-errors'
import { formatDateTime } from '@/shared/utils/format/date'
import { t as translate } from '@/lib/i18n'
import type { PosConnection } from '@/features/restaurant/api/pos-connection.api'
import { usePosConnection } from '@/features/restaurant/hooks/use-pos-connection'

/** The problems listed before "Show all". */
const SHOWN_PROBLEMS = 3

const posLinkSchema = z.object({
  address: z
    .string()
    .trim()
    .min(1, { error: () => translate('features:pos.addressRequired') })
    .max(255),
  key: z
    .string()
    .trim()
    .min(20, { error: () => translate('features:pos.keyRequired') })
    .max(100),
})

type PosLinkValues = z.infer<typeof posLinkSchema>

/**
 * Connect to POS: the menu takes its categories and dishes from a POS
 * branch. Not linked, the POS's address and the key made in it; linked,
 * which branch, when it last synced (or why it could not), what it could not
 * bring over, "Sync now" and Disconnect. The POS is always "your POS".
 */
export function PosConnectionCard() {
  const { t } = useTranslation('features')
  // Dates in the dashboard's language.
  const locale = usePreferencesStore((state) => state.locale)
  const { query, syncing, link, sync, unlink, sendOrders } = usePosConnection()

  return (
    <SectionCard
      icon={<IconCashRegister className="size-[18px]" stroke={1.8} />}
      title={t('pos.title')}
      description={t('pos.description')}
      className="xl:col-span-2"
    >
      {query.isPending ? (
        <Skeleton className="h-[120px] w-full rounded-tile" />
      ) : query.isError ? (
        <ErrorState description={query.error.message} onRetry={() => void query.refetch()} />
      ) : query.data ? (
        <Linked
          connection={query.data}
          locale={locale}
          syncing={syncing || sync.isPending}
          unlinking={unlink.isPending}
          onSync={() => sync.mutate()}
          onUnlink={(done) => unlink.mutate(undefined, { onSuccess: done })}
          onSendOrders={(next) => sendOrders.mutate(next)}
        />
      ) : (
        <LinkForm
          busy={link.isPending}
          onLink={(values, onError) => link.mutate(values, { onError })}
        />
      )}
    </SectionCard>
  )
}

function LinkForm({
  busy,
  onLink,
}: {
  busy: boolean
  onLink: (values: PosLinkValues, onError: (error: unknown) => void) => void
}) {
  const { t } = useTranslation('features')
  const form = useForm<PosLinkValues>({
    resolver: zodResolver(posLinkSchema),
    defaultValues: { address: '', key: '' },
  })
  const { formError, applyApiError, clearFormError } = useApiFormErrors(form.setError)

  const submit = form.handleSubmit((values) => {
    clearFormError()
    onLink(values, applyApiError)
  })

  return (
    <form className="flex flex-col gap-3" onSubmit={submit} noValidate data-pos-link>
      <p className="text-[13px] text-[var(--muted)]">{t('pos.howTo')}</p>
      {formError ? (
        <Alert variant="error" size="sm">
          {formError}
        </Alert>
      ) : null}
      <TextField
        control={form.control}
        name="address"
        label={t('pos.address')}
        placeholder="https://pos.example.com"
        hint={t('pos.addressHint')}
        inputMode="url"
        forceLtr
        required
      />
      <TextField
        control={form.control}
        name="key"
        label={t('pos.key')}
        hint={t('pos.keyHint')}
        autoComplete="off"
        password
        forceLtr
        required
      />
      <Button
        type="submit"
        className="self-start"
        loading={busy}
        leadingIcon={<IconPlugConnected className="size-[18px]" />}
      >
        {t('pos.connect')}
      </Button>
    </form>
  )
}

function Linked({
  connection,
  locale,
  syncing,
  unlinking,
  onSync,
  onUnlink,
  onSendOrders,
}: {
  connection: PosConnection
  locale: Locale
  syncing: boolean
  unlinking: boolean
  onSync: () => void
  onUnlink: (done: () => void) => void
  onSendOrders: (next: boolean) => void
}) {
  const { t } = useTranslation('features')
  const [asking, setAsking] = useState(false)
  const [allProblems, setAllProblems] = useState(false)
  const problems = connection.problems
  const shown = allProblems ? problems : problems.slice(0, SHOWN_PROBLEMS)
  const where = [connection.company, connection.branch].filter(Boolean).join(' · ')

  return (
    <div className="flex flex-col gap-3" data-pos-linked>
      <div className="inset-tile flex flex-col gap-1 rounded-tile p-3">
        <p className="text-[14px] font-medium" dir="auto">
          {t('pos.linkedTo', { where: where || connection.address })}
        </p>
        <p className="truncate text-[12px] text-[var(--faint)]" dir="ltr">
          {connection.address}
        </p>
        <p className="text-[12.5px] text-[var(--muted)]" data-pos-status>
          {syncing
            ? t('pos.syncingNow')
            : connection.last_synced_at
              ? t('pos.lastSynced', { time: formatDateTime(connection.last_synced_at, locale) })
              : t('pos.neverSynced')}
        </p>
      </div>

      {connection.last_error && !syncing ? (
        <Alert
          variant="warning"
          size="sm"
          title={
            connection.unreachable_since
              ? t('pos.unreachableTitle', {
                  time: formatDateTime(connection.unreachable_since, locale),
                })
              : t('pos.errorTitle')
          }
        >
          {connection.last_error}
        </Alert>
      ) : null}

      {problems.length > 0 ? (
        <Alert variant="warning" size="sm" title={t('pos.problems', { count: problems.length })}>
          <ul className="flex flex-col gap-1" data-pos-problems>
            {shown.map((problem) => (
              <li key={`${problem.type}:${problem.message}`} dir="auto">
                {problem.message}
              </li>
            ))}
          </ul>
          {problems.length > SHOWN_PROBLEMS ? (
            <Button
              variant="link"
              size="sm"
              className="mt-1 px-0"
              onClick={() => setAllProblems((open) => !open)}
            >
              {allProblems ? t('pos.showFewer') : t('pos.showAll', { count: problems.length })}
            </Button>
          ) : null}
        </Alert>
      ) : null}

      <SendOrders
        on={connection.sends_orders}
        ordersInMenu={connection.orders_in_menu}
        onChange={onSendOrders}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          loading={syncing}
          leadingIcon={<IconRefresh className="size-[18px]" />}
          onClick={onSync}
        >
          {t('pos.syncNow')}
        </Button>
        <Button
          variant="ghost"
          leadingIcon={<IconUnlink className="size-[18px]" />}
          onClick={() => setAsking(true)}
        >
          {t('pos.disconnect')}
        </Button>
      </div>

      <ConfirmDialog
        open={asking}
        loading={unlinking}
        title={t('pos.disconnectTitle')}
        description={t('pos.disconnectDescription')}
        confirmLabel={t('pos.disconnect')}
        onConfirm={() => onUnlink(() => setAsking(false))}
        onCancel={() => setAsking(false)}
      />
    </div>
  )
}

/**
 * Whether orders placed in the menu go to the POS. While guests send their
 * orders on WhatsApp nothing can go, so the switch waits, with a way to the
 * ordering setting on this page.
 */
function SendOrders({
  on,
  ordersInMenu,
  onChange,
}: {
  on: boolean
  ordersInMenu: boolean
  onChange: (next: boolean) => void
}) {
  const { t } = useTranslation('features')
  const id = useId()

  const openOrdering = () =>
    document
      .querySelector('[data-feature="orders"]')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  return (
    <div className="inset-tile flex items-start gap-3 rounded-tile p-3" data-pos-orders>
      <div className="min-w-0 flex-1">
        <p id={`${id}-label`} className="text-[14px] font-medium">
          {t('pos.sendOrders')}
        </p>
        <p id={`${id}-hint`} className="mt-0.5 text-[12px] leading-snug text-[var(--muted)]">
          {ordersInMenu ? t('pos.sendOrdersHint') : t('pos.sendOrdersWhatsApp')}
        </p>
        {ordersInMenu ? null : (
          <Button
            variant="link"
            size="sm"
            className="mt-1 h-auto px-0 text-[12px] font-medium"
            onClick={openOrdering}
          >
            {t('pos.openOrdering')}
          </Button>
        )}
      </div>
      <Switch
        checked={on && ordersInMenu}
        disabled={!ordersInMenu}
        onChange={onChange}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-hint`}
        className="mt-0.5"
      />
    </div>
  )
}
