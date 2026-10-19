import {
  IconDownload,
  IconExternalLink,
  IconPencil,
  IconPrinter,
  IconRefresh,
  IconTrash,
  type TablerIcon,
} from '@tabler/icons-react'
import type { Options } from 'qr-code-styling'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui'
import { cn } from '@/shared/utils/dom/cn'
import { TableQr } from '@/features/tables/components/list/table-qr'
import type { DiningTable } from '@/features/tables/schemas/table.schema'

export type TableCardProps = {
  table: DiningTable
  /** The QR design's options, without the table's link. */
  options: Options
  onDownload: (table: DiningTable) => void
  onPrint: (table: DiningTable) => void
  onRename: (table: DiningTable) => void
  onNewCode: (table: DiningTable) => void
  onRemove: (table: DiningTable) => void
}

/** One table: its code as it will print, and what can be done with it. */
export const TableCard = memo(function TableCard({
  table,
  options,
  onDownload,
  onPrint,
  onRename,
  onNewCode,
  onRemove,
}: TableCardProps) {
  const { t } = useTranslation('tables')

  // Its own link on the page's look, kept between renders: TableQr redraws
  // the code whenever this changes.
  const qrOptions = useMemo(() => ({ ...options, data: table.url }), [options, table.url])

  return (
    <article className="flex min-w-0 flex-col items-center gap-3 glass-card rounded-card p-3 sm:p-4">
      {/* The code as it will print, on its own colour. */}
      <div
        className="w-full rounded-tile p-1.5"
        style={{ background: options.backgroundOptions?.color ?? '#FFFFFF' }}
      >
        <TableQr
          options={qrOptions}
          size={240}
          fill
          label={t('card.qrLabel', { name: table.name })}
        />
      </div>
      <div className="flex w-full flex-col items-center gap-1.5">
        <h3
          className="w-full truncate text-center font-display text-[20px] leading-tight"
          title={table.name}
        >
          {table.name}
        </h3>
        <span aria-hidden className="h-px w-6 bg-gold" />
      </div>
      {/* One even row of five, whatever the card's width. */}
      <div className="grid w-full grid-cols-5 gap-1">
        <Action
          icon={IconExternalLink}
          label={t('card.open')}
          onClick={() => window.open(ownerView(table.url), '_blank', 'noopener,noreferrer')}
        />
        <Action icon={IconDownload} label={t('card.download')} onClick={() => onDownload(table)} />
        <Action icon={IconPrinter} label={t('card.print')} onClick={() => onPrint(table)} />
        <Action icon={IconPencil} label={t('card.rename')} onClick={() => onRename(table)} />
        <Action icon={IconRefresh} label={t('card.newCode')} onClick={() => onNewCode(table)} />
      </div>
      {/* Removing stands apart, under a hairline: it cannot be taken back. */}
      <div className="grid w-full grid-cols-5 gap-1 border-t-[0.5px] border-[var(--line)] pt-3 [&>*]:col-start-3">
        <Action icon={IconTrash} label={t('card.remove')} danger onClick={() => onRemove(table)} />
      </div>
    </article>
  )
})

/**
 * The table's menu as the owner opens it to look: the same link, without
 * the `qr` mark, so their own visit is not counted as a guest's scan.
 */
function ownerView(url: string): string {
  const link = new URL(url)
  link.searchParams.delete('qr')
  return link.toString()
}

function Action({
  icon: Icon,
  label,
  danger = false,
  onClick,
}: {
  icon: TablerIcon
  label: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'aspect-square h-auto w-full max-w-9 justify-self-center rounded-tile border-[0.5px] px-0',
        danger
          ? 'border-status-danger-border bg-status-danger-wash text-status-danger hover:brightness-110'
          : 'border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_45%,transparent)] text-[var(--text)] hover:bg-[var(--hover-wash)]',
      )}
    >
      <Icon aria-hidden className="size-3.5 sm:size-4" />
    </Button>
  )
}
