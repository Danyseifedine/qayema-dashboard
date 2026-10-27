import { IconQrcode, IconRefresh, IconToolsKitchen2, IconX } from '@tabler/icons-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Collapse, SectionCard } from '@/shared/components/ui'
import { useUiStore } from '@/stores/ui.store'

const STEPS = [
  { key: 'fill', icon: IconToolsKitchen2 },
  { key: 'share', icon: IconQrcode },
  { key: 'change', icon: IconRefresh },
] as const

/**
 * How Qayema works, in three lines: fill in the menu, put its QR code on the
 * tables, change it any time. On the same glass card, with the same title,
 * as the steps beside it. Put away by the owner once read (remembered in
 * this browser); the Overview then offers it back. Either one slides in as
 * the other slides away, and the keyboard follows to the one shown.
 */
export function HowItWorks() {
  const { t } = useTranslation('overview')
  const hidden = useUiStore((state) => state.guideHidden)
  const setHidden = useUiStore((state) => state.setGuideHidden)
  const showRef = useRef<HTMLButtonElement>(null)
  const hideRef = useRef<HTMLButtonElement>(null)

  const toggle = (next: boolean) => {
    setHidden(next)
    // The button pressed is about to slide away: focus goes to its partner.
    requestAnimationFrame(() => (next ? showRef : hideRef).current?.focus())
  }

  return (
    <div className="flex flex-col">
      <Collapse open={hidden}>
        <Button
          ref={showRef}
          variant="link"
          size="sm"
          className="px-0"
          onClick={() => toggle(false)}
        >
          {t('guide.show')}
        </Button>
      </Collapse>
      <Collapse open={!hidden}>
        <SectionCard
          title={t('guide.title')}
          description={t('guide.description')}
          action={
            <Button
              ref={hideRef}
              variant="ghost"
              size="icon-sm"
              className="-me-1.5 shrink-0 text-[var(--muted)]"
              aria-label={t('guide.hide')}
              onClick={() => toggle(true)}
            >
              <IconX aria-hidden className="size-4" />
            </Button>
          }
        >
          <ol className="flex flex-col gap-3">
            {STEPS.map(({ key, icon: Icon }, index) => (
              <li key={key} className="inset-tile flex items-start gap-3 rounded-tile p-3">
                <span
                  aria-hidden
                  className="grid size-9 shrink-0 place-items-center rounded-tile bg-accent-wash text-accent"
                >
                  <Icon className="size-[18px]" stroke={1.7} />
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium text-[var(--text)]">
                    <span className="text-[var(--muted)] tabular-nums">{index + 1}. </span>
                    {t(`guide.steps.${key}.title`)}
                  </p>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-[var(--muted)]">
                    {t(`guide.steps.${key}.body`)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </SectionCard>
      </Collapse>
    </div>
  )
}
