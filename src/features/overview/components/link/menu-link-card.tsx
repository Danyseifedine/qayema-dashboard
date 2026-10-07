import { IconCopy, IconExternalLink, IconLink, IconQrcode } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { toast } from '@/shared/components/feedback'
import { Button } from '@/shared/components/ui'

export type MenuLinkCardProps = {
  /** Where guests open the menu, e.g. "https://qayema.com/cedar-and-salt". */
  publicUrl: string
  onOpenQr: () => void
}

/**
 * The menu's link, first thing on the Overview: what to share, a copy of it
 * in one tap, the menu itself, and the QR code that carries it.
 */
export function MenuLinkCard({ publicUrl, onOpenQr }: MenuLinkCardProps) {
  const { t } = useTranslation('overview')
  const shown = publicUrl.replace(/^https?:\/\//, '')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      toast.success(t('link.copied'))
    } catch {
      toast.error(t('link.copyFailed'))
    }
  }

  return (
    <section
      aria-label={t('link.label')}
      className="flex flex-col gap-3 rounded-[14px] border-[0.5px] border-accent-border bg-accent-wash p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--surface)] text-accent"
        >
          <IconLink className="size-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="text-[12.5px] text-[var(--muted)]">{t('link.live')}</p>
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer noopener"
            dir="ltr"
            className="block truncate text-[16px] font-medium text-[var(--text)] hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-on)]"
          >
            {shown}
          </a>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          size="sm"
          leadingIcon={<IconCopy aria-hidden className="size-4" />}
          onClick={() => void copy()}
        >
          {t('link.copy')}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          leadingIcon={<IconExternalLink aria-hidden className="size-4" />}
          onClick={() => window.open(publicUrl, '_blank', 'noopener,noreferrer')}
        >
          {t('link.open')}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          leadingIcon={<IconQrcode aria-hidden className="size-4" />}
          onClick={onOpenQr}
        >
          {t('link.qr')}
        </Button>
      </div>
    </section>
  )
}
