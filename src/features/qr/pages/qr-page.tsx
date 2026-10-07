import { zodResolver } from '@hookform/resolvers/zod'
import type { TFunction } from 'i18next'
import {
  IconCopy,
  IconDownload,
  IconExternalLink,
  IconPalette,
  IconRotate,
} from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { usePackageFor } from '@/features/package'
import { ErrorState, LockedState, toast } from '@/shared/components/feedback'
import type { Locale } from '@/shared/constants/locales'
import { Form, FormActions, FormSection } from '@/shared/components/forms'
import { Alert, Button } from '@/shared/components/ui'
import { CardControls } from '@/features/qr/components/controls/card-controls'
import { ColorControls } from '@/features/qr/components/controls/color-controls'
import { LogoControls } from '@/features/qr/components/controls/logo-controls'
import { ShapeControls } from '@/features/qr/components/controls/shape-controls'
import { downloadQr } from '@/features/qr/utils/qr-download'
import { qrOptions, weakParts, type WeakPart } from '@/features/qr/utils/qr-options'
import { QrPreview } from '@/features/qr/components/preview/qr-preview'
import { QrStats } from '@/features/qr/components/stats/qr-stats'
import { useQr, useSaveQr } from '@/features/qr/hooks/use-qr'
import {
  qrFormSchema,
  toDesign,
  toFormValues,
  type Qr,
  type QrFormValues,
} from '@/features/qr/schemas/qr.schema'

/** Everything that changes how the code looks: what "Reset to simple" puts back. */
const LOOK_FIELDS = [
  'dot_style',
  'dot_color',
  'dot_gradient',
  'gradient_type',
  'corner_style',
  'corner_color',
  'eye_style',
  'eye_color',
  'background',
  'logo',
  'logo_size',
] as const satisfies readonly (keyof QrFormValues)[]

/**
 * The menu's QR code: a plain one that works as it is, and everything needed
 * to make it the restaurant's own. The link it encodes never changes, so a
 * code already on the tables keeps working whatever is saved here.
 */
export type QrPageProps = {
  locale: Locale
  /** Opens the Features page, where the owner switches the studio back on. */
  onOpenFeatures: () => void
  /** Opens the Package page, for a package without the studio. */
  onOpenPackage: () => void
}

export function QrPage(props: QrPageProps) {
  const { t } = useTranslation('qr')
  const qr = useQr()

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h2 className="font-display text-[19px] leading-tight">{t('page.title')}</h2>
        <p className="mt-1 text-[13px] leading-snug text-[var(--muted)]">{t('page.description')}</p>
      </div>

      {qr.isPending ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="h-[380px] animate-pulse rounded-[18px] bg-[var(--hover-wash)]" />
          <div className="h-[520px] animate-pulse rounded-[18px] bg-[var(--hover-wash)]" />
        </div>
      ) : qr.isError ? (
        <ErrorState description={qr.error.message} onRetry={() => void qr.refetch()} />
      ) : (
        <QrStudio qr={qr.data} {...props} />
      )}
    </div>
  )
}

function QrStudio({ qr, locale, onOpenFeatures, onOpenPackage }: QrPageProps & { qr: Qr }) {
  const { t } = useTranslation('qr')
  const save = useSaveQr()
  const [downloading, setDownloading] = useState<'png' | 'svg' | null>(null)

  const form = useForm<QrFormValues>({
    resolver: zodResolver(qrFormSchema),
    defaultValues: toFormValues(qr.settings),
  })

  // The preview follows what is on screen, saved or not.
  const values = useWatch({ control: form.control }) as QrFormValues
  const design = useMemo(() => toDesign(values), [values])
  const options = useMemo(
    () => qrOptions(design, qr.url, qr.logo_data_url),
    [design, qr.url, qr.logo_data_url],
  )
  const weak = weakParts(design)
  const dirty = form.formState.isDirty

  const fileName = `${qr.display_url.split('/').pop() || 'menu'}-qr`

  const download = async (extension: 'png' | 'svg') => {
    setDownloading(extension)
    try {
      await downloadQr(options, fileName, extension)
    } catch {
      toast.error(t('page.downloadFailed'))
    } finally {
      setDownloading(null)
    }
  }

  // The plain menu link, not the ?qr=1 one: a link shared by hand is not a
  // scan, and counting it as one would inflate the numbers below.
  const copyLink = async () => {
    const link = new URL(qr.url)
    link.searchParams.delete('qr')
    try {
      await navigator.clipboard.writeText(link.toString())
      toast.success(t('page.linkCopied'))
    } catch {
      toast.error(t('page.copyFailed'))
    }
  }

  const resetToSimple = () => {
    const simple = toFormValues(qr.defaults)
    for (const field of LOOK_FIELDS) {
      form.setValue(field, simple[field], { shouldDirty: true, shouldValidate: true })
    }
  }

  const onSubmit = form.handleSubmit((submitted) => {
    save.mutate(toDesign(submitted), {
      onSuccess: (saved) => form.reset(toFormValues(saved.settings)),
    })
  })

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
      <aside className="flex flex-col gap-3 lg:sticky lg:top-4">
        <div className="flex justify-center rounded-[18px] border-[0.5px] border-[var(--line)] bg-[var(--surface)] p-5">
          <QrPreview options={options} />
        </div>

        {weak.length > 0 ? (
          <Alert variant="warning" title={t('contrast.title')}>
            {t('contrast.warning', { count: weak.length, parts: listParts(weak, t) })}
          </Alert>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <Button
            leadingIcon={<IconDownload aria-hidden className="size-4" />}
            loading={downloading === 'png'}
            disabled={downloading !== null}
            onClick={() => void download('png')}
          >
            {t('page.png')}
          </Button>
          <Button
            variant="secondary"
            leadingIcon={<IconDownload aria-hidden className="size-4" />}
            loading={downloading === 'svg'}
            disabled={downloading !== null}
            onClick={() => void download('svg')}
          >
            {t('page.svg')}
          </Button>
        </div>
        <p className="text-[12px] leading-snug text-[var(--muted)]">{t('page.formatHint')}</p>

        <div className="flex items-center gap-2 rounded-[12px] border-[0.5px] border-[var(--line)] bg-[var(--surface)] py-1.5 ps-3.5 pe-1.5">
          <span dir="ltr" className="min-w-0 flex-1 truncate text-[13px] text-[var(--muted)]">
            {qr.display_url}
          </span>
          <Button
            variant="ghost"
            size="sm"
            leadingIcon={<IconCopy aria-hidden className="size-4" />}
            onClick={() => void copyLink()}
          >
            {t('page.copyLink')}
          </Button>
        </div>

        {qr.card_url ? (
          <a
            href={qr.card_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-accent underline-offset-4 hover:underline"
          >
            <IconExternalLink aria-hidden className="size-4" />
            {t('page.openCard')}
          </a>
        ) : null}
        {qr.card_url && dirty ? (
          <p className="text-[12px] leading-snug text-[var(--muted)]">{t('page.cardUnsaved')}</p>
        ) : null}
      </aside>

      <div className="flex min-w-0 flex-col gap-4">
        {qr.stats ? (
          <FormSection title={t('page.scansTitle')} description={t('page.scansDescription')}>
            <QrStats stats={qr.stats} />
          </FormSection>
        ) : null}

        {qr.unlocked ? (
          <Form onSubmit={onSubmit}>
            <FormSection title={t('page.colors')}>
              <ColorControls form={form} />
            </FormSection>
            <FormSection title={t('page.shapes')}>
              <ShapeControls control={form.control} />
            </FormSection>
            <FormSection title={t('page.logo')}>
              <LogoControls control={form.control} hasLogo={qr.logo_data_url !== null} />
            </FormSection>
            <FormSection title={t('page.card')} description={t('page.cardDescription')}>
              <CardControls control={form.control} brandColor={qr.brand_color} />
            </FormSection>

            <FormActions align="between">
              <Button
                variant="ghost"
                leadingIcon={<IconRotate aria-hidden className="size-4" />}
                onClick={resetToSimple}
                disabled={save.isPending}
              >
                {t('page.resetToSimple')}
              </Button>
              <Button type="submit" loading={save.isPending} disabled={!dirty}>
                {t('page.save')}
              </Button>
            </FormActions>
          </Form>
        ) : qr.switched_off ? (
          // The owner's own switch, not the package: send them to it.
          <Alert variant="info" title={t('page.offTitle')}>
            <p>{t('page.offDescription')}</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={onOpenFeatures}>
              {t('page.openFeatures')}
            </Button>
          </Alert>
        ) : (
          <StudioLocked locale={locale} onOpenPackage={onOpenPackage} />
        )}
      </div>
    </div>
  )
}

/** Each weak part's name, by the value `weakParts()` gives it. */
const PART_KEYS = {
  dots: 'contrast.parts.dots',
  gradient: 'contrast.parts.gradient',
  'corner frames': 'contrast.parts.cornerFrames',
  'corner centres': 'contrast.parts.cornerCentres',
} as const satisfies Record<WeakPart, string>

/**
 * "dots, gradient and corner centres". The separators are translated rather
 * than left to Intl.ListFormat, whose English adds a comma before "and".
 */
function listParts(parts: WeakPart[], t: TFunction<'qr'>): string {
  const names = parts.map((part) => t(PART_KEYS[part]))
  if (names.length === 1) return names[0]!
  return `${names.slice(0, -1).join(t('contrast.separator'))}${t('contrast.lastSeparator')}${names.at(-1)}`
}

/** The studio on a package without it: the plain code works, this is what it would add. */
function StudioLocked({ locale, onOpenPackage }: { locale: Locale; onOpenPackage: () => void }) {
  const { t } = useTranslation('qr')
  const unlockedBy = usePackageFor('qr_studio', locale)

  return (
    <LockedState
      icon={IconPalette}
      title={t('page.lockedTitle')}
      description={t('page.lockedDescription')}
      includes={(['colors', 'shapes', 'logo', 'card'] as const).map((line) =>
        t(`page.lockedIncludes.${line}`),
      )}
      unlockedBy={unlockedBy ?? undefined}
      action={{ label: t('page.seePackages'), onClick: onOpenPackage }}
    />
  )
}
