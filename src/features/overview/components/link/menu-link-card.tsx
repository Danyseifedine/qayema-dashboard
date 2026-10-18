import { IconEye, IconQrcode, IconShare } from '@tabler/icons-react'
import { Trans, useTranslation } from 'react-i18next'
import { copyWithToast } from '@/shared/components/feedback'
import { Button } from '@/shared/components/ui'

export type MenuLinkCardProps = {
  /** Where guests open the menu, e.g. "https://qayema.com/cedar-and-salt". */
  publicUrl: string
  onOpenQr: () => void
}

/** The phone showing a menu, drawn over the card's top corner. */
const BANNER = '/assets/images/dashboard/overview-banner.webp'

/**
 * The menu's link, first thing on Home: that it is live and where, one big
 * Share (the phone's own share menu, so WhatsApp, Instagram and the rest),
 * then the menu itself and its QR code.
 */
export function MenuLinkCard({ publicUrl, onOpenQr }: MenuLinkCardProps) {
  const { t } = useTranslation('overview')
  const shown = publicUrl.replace(/^https?:\/\//, '')

  const copy = () =>
    copyWithToast(publicUrl, { copied: t('link.copied'), failed: t('link.copyFailed') })

  // A computer without a share menu copies the link instead. Closing the
  // phone's share menu is not an error.
  const share = async () => {
    if (typeof navigator.share !== 'function') return copy()
    try {
      await navigator.share({ title: t('link.shareTitle'), url: publicUrl })
    } catch (error) {
      if ((error as Error).name !== 'AbortError') await copy()
    }
  }

  // The phone is min(56%, 260px) wide everywhere below; the text leaves it
  // room from that same number, so it never runs under the phone.
  return (
    <section
      aria-label={t('link.label')}
      className="glass-card relative mt-10 rounded-card bg-[linear-gradient(160deg,var(--accent-wash),transparent_55%)] p-3.5 sm:p-4"
    >
      {/* The phone rises out of the card's top, its outer edge on the card's,
          and sinks into a shadow behind the buttons; mirrored in Arabic. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-11 start-0 -end-4 bottom-0 overflow-hidden [mask-image:linear-gradient(to_bottom,#000_38%,rgb(0_0_0/0.55)_62%,rgb(0_0_0/0.15)_82%,transparent_96%)] sm:-end-6"
      >
        <img
          src={BANNER}
          alt=""
          width={1254}
          height={1254}
          decoding="async"
          className="absolute top-0 end-[calc(1rem-min(56%,260px)*0.16)] w-[min(56%,260px)] drop-shadow-[var(--phone-shadow)] rtl:-scale-x-100 sm:end-[calc(1.5rem-min(56%,260px)*0.16)]"
        />
      </div>

      <div className="relative">
        <div className="min-w-0 pe-[calc(min(56%,260px)*0.62)]">
          <p className="font-display text-[20px] leading-tight sm:text-[24px]">
            <Trans
              t={t}
              i18nKey="link.title"
              components={{
                live: <span className="text-[var(--live)]" />,
              }}
            />
          </p>
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer noopener"
            dir="ltr"
            className="block truncate text-[13px] text-[var(--muted)] sm:text-[14px] rtl:text-right hover:text-accent hover:underline focus-ring"
          >
            {shown}
          </a>
        </div>
        <p className="mt-2 pe-[calc(min(56%,260px)*0.7+8px)] text-[11.5px] leading-snug text-[var(--muted)] sm:text-[13px]">
          {t('link.body')}
        </p>
      </div>

      {/* Preview and QR code as wide as their words, Share the rest; a narrow
          phone shortens it to "Share" rather than cutting a word. */}
      <div className="@container relative mt-3 max-w-[30rem] sm:mt-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-1.5">
          <Button
            variant="primary"
            aria-label={t('link.share')}
            className="h-10 min-w-0 gap-1 px-2 text-[13px] sm:h-11 sm:text-[14px]"
            leadingIcon={<IconShare aria-hidden className="size-[15px] shrink-0" />}
            onClick={() => void share()}
          >
            <span className="truncate @max-[20rem]:hidden">{t('link.share')}</span>
            <span className="hidden @max-[20rem]:inline">{t('link.shareShort')}</span>
          </Button>
          <Button
            variant="secondary"
            className="h-10 gap-1 px-2.5 text-[12.5px] whitespace-nowrap sm:h-11 sm:px-4 sm:text-[13.5px]"
            leadingIcon={<IconEye aria-hidden className="size-[15px] shrink-0" />}
            onClick={() => window.open(publicUrl, '_blank', 'noopener,noreferrer')}
          >
            {t('link.preview')}
          </Button>
          <Button
            variant="secondary"
            className="h-10 gap-1 px-2.5 text-[12.5px] whitespace-nowrap sm:h-11 sm:px-4 sm:text-[13.5px]"
            leadingIcon={<IconQrcode aria-hidden className="size-[15px] shrink-0" />}
            onClick={onOpenQr}
          >
            {t('link.qr')}
          </Button>
        </div>
      </div>
    </section>
  )
}
