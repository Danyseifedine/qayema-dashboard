import type { Options } from 'qr-code-styling'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { TableQr } from '@/features/tables/components/list/table-qr'
import type { DiningTable } from '@/features/tables/schemas/table.schema'

export type PrintSheetProps = {
  tables: readonly DiningTable[]
  options: Options
  /** The card's heading from the QR design, if the owner wrote one. */
  title: string | null
  /** Whether guests can order from the code, which changes what it invites. */
  ordering: boolean
}

/**
 * The cards as they go on paper, one per table, two to a row. Only printing
 * shows it (globals.css hides everything else then), so it never appears on
 * screen.
 */
export function PrintSheet({ tables, options, title, ordering }: PrintSheetProps) {
  const { t } = useTranslation('tables')

  return createPortal(
    <div className="qy-print-sheet" aria-hidden>
      <div className="grid grid-cols-2 gap-[10mm]">
        {tables.map((table) => (
          <section
            key={table.id}
            className="flex break-inside-avoid flex-col items-center gap-[4mm] rounded-[6mm] border border-[#E5E7EB] px-[6mm] py-[8mm] text-center text-[#111418]"
          >
            {title ? <p className="text-[11pt] font-medium text-[#6B7280]">{title}</p> : null}
            <p className="text-[24pt] leading-tight font-bold">{table.name}</p>
            <div
              className="rounded-[4mm] p-[3mm]"
              style={{ background: options.backgroundOptions?.color ?? '#FFFFFF' }}
            >
              <TableQr options={{ ...options, data: table.url }} size={200} label={table.name} />
            </div>
            <p className="text-[12pt] font-semibold">
              {ordering ? t('print.ctaOrder') : t('print.ctaMenu')}
            </p>
          </section>
        ))}
      </div>
    </div>,
    document.body,
  )
}
