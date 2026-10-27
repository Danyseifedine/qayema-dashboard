import { ErrorState, Skeleton } from '@/shared/components/feedback'
import { QrStudio, type QrStudioProps } from '@/features/qr/components/studio/qr-studio'
import { useQr } from '@/features/qr/hooks/use-qr'

/**
 * The menu's QR code: a plain one that works as it is, and everything needed
 * to make it the restaurant's own. The link it encodes never changes, so a
 * code already on the tables keeps working whatever is saved here.
 */
export type QrPageProps = Omit<QrStudioProps, 'qr'>

export function QrPage(props: QrPageProps) {
  const qr = useQr()

  // The page's title and what it is for are in the topbar's heading.
  return qr.isPending ? (
    <div className="flex w-full flex-col gap-3">
      <Skeleton className="h-[300px]" />
      <Skeleton className="h-[140px]" />
      <Skeleton className="h-[140px]" />
    </div>
  ) : qr.isError ? (
    <ErrorState description={qr.error.message} onRetry={() => void qr.refetch()} />
  ) : (
    <QrStudio qr={qr.data} {...props} />
  )
}
