import { IconQrcode, IconRefresh, IconToolsKitchen2, IconX } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui'
import { useUiStore } from '@/stores/ui.store'

const STEPS = [
  { key: 'fill', icon: IconToolsKitchen2 },
  { key: 'share', icon: IconQrcode },
  { key: 'change', icon: IconRefresh },
] as const

/**
 * How Qayema works, in three lines: fill in the menu, put its QR code on the
 * tables, change it any time. Put away by the owner once read (remembered in
 * this browser); the Overview then offers it back.
 */
export function HowItWorks() {
  const { t } = useTranslation('overview')
  const hidden = useUiStore((state) => state.guideHidden)
  const setHidden = useUiStore((state) => state.setGuideHidden)

  if (hidden) {
    return (
      <Button variant="link" size="sm" className="self-start px-0" onClick={() => setHidden(false)}>
        {t('guide.show')}
      </Button>
    )
  }

  return (
    <section
      aria-labelledby="how-it-works"
      className="rounded-[14px] border-[0.5px] border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3 border-b-[0.5px] border-[var(--line-2)] pb-3.5">
        <div>
          <h3 id="how-it-works" className="label-caps text-[var(--muted)]">
            {t('guide.title')}
          </h3>
          <p className="mt-1 text-[13px] text-[var(--muted)]">{t('guide.description')}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label={t('guide.hide')}
          onClick={() => setHidden(true)}
        >
          <IconX aria-hidden className="size-4" />
        </Button>
      </div>

      <ol className="mt-4 flex flex-col gap-4">
        {STEPS.map(({ key, icon: Icon }, index) => (
          <li key={key} className="flex gap-3">
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-accent-wash text-accent"
            >
              <Icon className="size-[18px]" />
            </span>
            <div>
              <p className="text-[13.5px] font-medium text-[var(--text)]">
                <span className="text-[var(--muted)]">{index + 1}. </span>
                {t(`guide.steps.${key}.title`)}
              </p>
              <p className="text-[12.5px] leading-snug text-[var(--muted)]">
                {t(`guide.steps.${key}.body`)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
