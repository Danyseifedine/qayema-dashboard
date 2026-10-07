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
import { memo } from 'react'
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

  return (
    <article className="flex min-w-0 flex-col items-center gap-3 rounded-[14px] border-[0.5px] border-[var(--line)] bg-[var(--surface)] p-3 transition-colors hover:border-[var(--line-strong)] sm:p-4">
      <div
        className="w-full max-w-[132px] rounded-[12px] p-2.5"
        style={{ background: options.backgroundOptions?.color ?? '#FFFFFF' }}
      >
        <TableQr
          options={{ ...options, data: table.url }}
          size={112}
          label={t('card.qrLabel', { name: table.name })}
        />
      </div>
      <h3 className="w-full truncate text-center text-[15px] font-semibold" title={table.name}>
        {table.name}
      </h3>
      <div className="flex flex-wrap justify-center gap-0.5">
        <Action
          icon={IconExternalLink}
          label={t('card.open')}
          onClick={() => window.open(ownerView(table.url), '_blank', 'noopener,noreferrer')}
        />
        <Action icon={IconDownload} label={t('card.download')} onClick={() => onDownload(table)} />
        <Action icon={IconPrinter} label={t('card.print')} onClick={() => onPrint(table)} />
        <Action icon={IconPencil} label={t('card.rename')} onClick={() => onRename(table)} />
        <Action icon={IconRefresh} label={t('card.newCode')} onClick={() => onNewCode(table)} />
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
        'size-8 text-[var(--muted)] hover:text-[var(--text)]',
        danger && 'hover:bg-status-danger-wash hover:text-status-danger',
      )}
    >
      <Icon aria-hidden className="size-4" />
    </Button>
  )
}
