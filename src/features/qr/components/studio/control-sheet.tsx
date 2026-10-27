import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, ModalHeader } from '@/shared/components/feedback'
import { Button } from '@/shared/components/ui'
import { cn } from '@/shared/utils/dom/cn'

export type ControlSheetProps = {
  open: boolean
  title: string
  onClose: () => void
  /** The live code, small, so a change shows while the sheet covers the page. */
  preview: ReactNode
  children: ReactNode
}

/**
 * Every choice behind one of the studio's tiles: a sheet up from the bottom
 * on a phone, a dialog in the middle on a wider screen. What is picked here
 * goes straight into the page's form, so Done only closes it and Save saves
 * as usual. Its fields exist only while it is open.
 */
export function ControlSheet({ open, title, onClose, preview, children }: ControlSheetProps) {
  const { t } = useTranslation('qr')

  return (
    <Modal
      open={open}
      onClose={onClose}
      className={cn(
        'm-0 mt-auto max-h-[88dvh] w-full max-w-none overflow-y-auto rounded-b-none',
        'sm:m-auto sm:w-[min(92vw,520px)] sm:rounded-card',
      )}
    >
      {open ? (
        <div className="flex flex-col gap-4 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <ModalHeader title={title} />
            <Button size="sm" onClick={onClose}>
              {t('page.done')}
            </Button>
          </div>
          <div className="mx-auto w-[132px]">{preview}</div>
          {children}
        </div>
      ) : null}
    </Modal>
  )
}
