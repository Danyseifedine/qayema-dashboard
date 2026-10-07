import { IconPlus, IconPrinter, IconToolsKitchen2 } from '@tabler/icons-react'
import type { Options } from 'qr-code-styling'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { downloadQr, qrOptions, useQr } from '@/features/qr'
import { ConfirmDialog, EmptyState, ErrorState } from '@/shared/components/feedback'
import { Alert, Button } from '@/shared/components/ui'
import { AddTablesDialog } from '@/features/tables/components/form/add-tables-dialog'
import { PrintSheet } from '@/features/tables/components/print/print-sheet'
import { RenameTableDialog } from '@/features/tables/components/form/rename-table-dialog'
import { TableCard } from '@/features/tables/components/list/table-card'
import { useDeleteTable, useNewTableCode, useTables } from '@/features/tables/hooks/use-tables'
import type { DiningTable } from '@/features/tables/schemas/table.schema'

export type TablesPageProps = {
  /** Where ordering at the table is switched on. */
  onOpenFeatures: () => void
}

/** Until the QR design arrives, the plain code: what every restaurant has. */
const PLAIN: Options = {
  margin: 0,
  qrOptions: { errorCorrectionLevel: 'M' },
  dotsOptions: { type: 'square', color: '#000000' },
  cornersSquareOptions: { type: 'square', color: '#000000' },
  cornersDotOptions: { type: 'square', color: '#000000' },
  backgroundOptions: { color: '#FFFFFF' },
}

/**
 * The restaurant's tables, each with a QR code of its own. A guest who scans
 * one orders to that table; the order arrives saying which. The codes wear
 * the QR page's design, so every card in the room matches.
 */
export function TablesPage({ onOpenFeatures }: TablesPageProps) {
  const { t } = useTranslation('tables')
  const tables = useTables()
  const qr = useQr()
  const newCode = useNewTableCode()
  const remove = useDeleteTable()

  const [adding, setAdding] = useState(false)
  const [renaming, setRenaming] = useState<DiningTable | null>(null)
  const [recoding, setRecoding] = useState<DiningTable | null>(null)
  const [removing, setRemoving] = useState<DiningTable | null>(null)
  const [printing, setPrinting] = useState<readonly DiningTable[] | null>(null)

  const list = useMemo(() => tables.data?.data ?? [], [tables.data])
  const takesOrders = tables.data?.meta.takes_orders ?? true
  const limit = tables.data?.meta.limit ?? 0

  // The design as the QR page has it: the owner's while the studio is open,
  // the plain one otherwise. Each table adds its own link.
  const options = useMemo<Options>(() => {
    if (!qr.data) return PLAIN
    const design = qr.data.unlocked ? qr.data.settings : qr.data.defaults
    return qrOptions(design, '', qr.data.unlocked ? qr.data.logo_data_url : null)
  }, [qr.data])
  const title = qr.data?.unlocked ? qr.data.settings.title : null

  // Printing waits a moment for the codes to draw (a logo loads first),
  // then lets go of the sheet once the dialog is done with.
  useEffect(() => {
    if (printing === null) return
    const done = () => setPrinting(null)
    window.addEventListener('afterprint', done, { once: true })
    const id = window.setTimeout(() => window.print(), options.image ? 700 : 150)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener('afterprint', done)
    }
  }, [printing, options.image])

  const print = useCallback((which: readonly DiningTable[]) => {
    // A second print of the same tables still needs a fresh sheet.
    flushSync(() => setPrinting(null))
    setPrinting(which)
  }, [])

  const download = useCallback(
    (table: DiningTable) =>
      void downloadQr({ ...options, data: table.url }, `qr-${slug(table.name)}`, 'png'),
    [options],
  )
  const printOne = useCallback((table: DiningTable) => print([table]), [print])

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[19px] leading-tight">{t('page.title')}</h2>
          <p className="mt-1 max-w-[560px] text-[13px] leading-snug text-[var(--muted)]">
            {t('page.description')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {list.length > 0 ? (
            <Button
              size="sm"
              variant="secondary"
              leadingIcon={<IconPrinter className="size-4" />}
              onClick={() => print(list)}
            >
              {t('page.printAll')}
            </Button>
          ) : null}
          <Button
            size="sm"
            leadingIcon={<IconPlus className="size-4" />}
            disabled={tables.data === undefined || list.length >= limit}
            onClick={() => setAdding(true)}
          >
            {t('page.add')}
          </Button>
        </div>
      </div>

      {tables.data && !takesOrders ? (
        <Alert variant="info" title={t('page.notOrderingTitle')}>
          <p>{t('page.notOrderingBody')}</p>
          <Button size="sm" variant="secondary" className="mt-2.5" onClick={onOpenFeatures}>
            {t('page.openFeatures')}
          </Button>
        </Alert>
      ) : null}

      {tables.data && list.length >= limit ? (
        <Alert variant="warning">{t('page.atLimit', { limit })}</Alert>
      ) : null}

      {tables.isPending ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-[232px] animate-pulse rounded-[14px] bg-[var(--hover-wash)]"
            />
          ))}
        </div>
      ) : tables.isError ? (
        <ErrorState description={tables.error.message} onRetry={() => void tables.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          fill
          icon={IconToolsKitchen2}
          title={t('page.emptyTitle')}
          description={t('page.emptyDescription')}
          action={<Button onClick={() => setAdding(true)}>{t('page.addFirst')}</Button>}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {list.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              options={options}
              onDownload={download}
              onPrint={printOne}
              onRename={setRenaming}
              onNewCode={setRecoding}
              onRemove={setRemoving}
            />
          ))}
        </div>
      )}

      <AddTablesDialog
        open={adding}
        existing={list.map((table) => table.name)}
        onClose={() => setAdding(false)}
      />

      <RenameTableDialog table={renaming} onClose={() => setRenaming(null)} />

      <ConfirmDialog
        open={recoding !== null}
        loading={newCode.isPending}
        title={t('page.newCodeTitle', { name: recoding?.name ?? '' })}
        description={t('page.newCodeDescription')}
        confirmLabel={t('page.newCodeConfirm')}
        onConfirm={() => {
          if (recoding) newCode.mutate(recoding.id, { onSuccess: () => setRecoding(null) })
        }}
        onCancel={() => setRecoding(null)}
      />

      <ConfirmDialog
        open={removing !== null}
        loading={remove.isPending}
        title={t('page.removeTitle', { name: removing?.name ?? '' })}
        description={t('page.removeDescription')}
        confirmLabel={t('page.removeConfirm')}
        onConfirm={() => {
          if (removing) remove.mutate(removing.id, { onSuccess: () => setRemoving(null) })
        }}
        onCancel={() => setRemoving(null)}
      />

      {printing !== null ? (
        <PrintSheet tables={printing} options={options} title={title} ordering={takesOrders} />
      ) : null}
    </div>
  )
}

/** A file name from a table's name; letters of any script stay. */
function slug(name: string): string {
  return (
    name
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'table'
  )
}
