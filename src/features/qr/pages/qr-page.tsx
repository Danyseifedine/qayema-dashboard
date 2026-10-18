import { zodResolver } from '@hookform/resolvers/zod'
import type { TFunction } from 'i18next'
import {
  IconChartBar,
  IconChevronRight,
  IconCircleDotFilled,
  IconCopy,
  IconDownload,
  IconExternalLink,
  IconLink,
  IconPalette,
  IconLetterT,
  IconRotate,
} from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { usePackageFor } from '@/features/package'
import {
  copyWithToast,
  ErrorState,
  LockedState,
  Skeleton,
  toast,
} from '@/shared/components/feedback'
import type { Locale } from '@/shared/constants/locales'
import { Form, FormActions } from '@/shared/components/forms'
import { Alert, Button } from '@/shared/components/ui'
import { CardTextControls } from '@/features/qr/components/controls/card-text-controls'
import { ColorControls } from '@/features/qr/components/controls/color-controls'
import { LogoControls } from '@/features/qr/components/controls/logo-controls'
import { ShapeControls } from '@/features/qr/components/controls/shape-controls'
import { ControlSheet } from '@/features/qr/components/studio/control-sheet'
import { CustomiseTiles, type StudioSheet } from '@/features/qr/components/studio/customise-tiles'
import { StudioCard } from '@/features/qr/components/studio/studio-card'
import { StudioOff } from '@/features/qr/components/studio/studio-off'
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

/** A dark marble table under warm lights: the stage the live code stands on. */
const GROUND = '/assets/images/dashboard/qr-ground.webp'

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

function QrStudio({ qr, locale, onOpenFeatures, onOpenPackage }: QrPageProps & { qr: Qr }) {
  const { t } = useTranslation('qr')
  const save = useSaveQr()
  const [downloading, setDownloading] = useState<'png' | 'svg' | null>(null)
  const [sheet, setSheet] = useState<StudioSheet | null>(null)

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
    await copyWithToast(link.toString(), {
      copied: t('page.linkCopied'),
      failed: t('page.copyFailed'),
    })
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

  const closeSheet = () => setSheet(null)
  const sheetPreview = <QrPreview options={options} />

  return (
    <div className="flex w-full flex-col gap-3">
      {/* The code, live, standing on a table; the buttons sit on its dark front edge. */}
      <div className="relative isolate overflow-hidden glass-card rounded-card p-3 sm:p-4">
        <img
          src={GROUND}
          alt=""
          aria-hidden
          decoding="async"
          className="pointer-events-none absolute inset-0 -z-10 size-full object-cover"
        />
        <div className="flex justify-center pt-2 pb-1 sm:pt-4">
          <QrPreview
            options={options}
            className="w-[52%] max-w-[240px] shadow-[0_18px_30px_-12px_rgba(0,0,0,0.85)]"
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            leadingIcon={<IconDownload aria-hidden className="size-4" />}
            loading={downloading === 'png'}
            disabled={downloading !== null}
            onClick={() => void download('png')}
          >
            {t('page.downloadImage')}
          </Button>
          <Button
            variant="secondary"
            leadingIcon={<IconDownload aria-hidden className="size-4" />}
            loading={downloading === 'svg'}
            disabled={downloading !== null}
            onClick={() => void download('svg')}
          >
            {t('page.downloadPrint')}
          </Button>
        </div>
      </div>

      {weak.length > 0 ? (
        <Alert variant="warning" title={t('contrast.title')}>
          {t('contrast.warning', { count: weak.length, parts: listParts(weak, t) })}
        </Alert>
      ) : null}

      <StudioCard icon={IconCircleDotFilled} title={t('page.linkTitle')}>
        <div className="flex h-11 items-center rounded-[12px] border-[0.5px] border-[var(--line)] bg-[var(--hover-wash)]">
          <IconLink aria-hidden className="mx-3 size-4 shrink-0 text-[var(--muted)]" />
          <span aria-hidden className="h-5 w-px shrink-0 bg-[var(--line)]" />
          <span dir="ltr" className="min-w-0 flex-1 truncate px-3 text-start text-[13.5px]">
            {qr.display_url}
          </span>
          <span aria-hidden className="h-5 w-px shrink-0 bg-[var(--line)]" />
          <Button
            variant="ghost"
            size="sm"
            className="mx-1 shrink-0"
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
            className="flex items-center gap-2.5 rounded-[8px] text-[13.5px] font-medium text-accent underline-offset-4 hover:underline focus-ring"
          >
            <IconExternalLink aria-hidden className="size-[18px] shrink-0" />
            <span className="min-w-0 flex-1">{t('page.openCard')}</span>
            <IconChevronRight aria-hidden className="size-4 shrink-0 rtl:rotate-180" />
          </a>
        ) : null}
        {qr.card_url && dirty ? (
          <p className="text-[12px] leading-snug text-[var(--muted)]">{t('page.cardUnsaved')}</p>
        ) : null}
      </StudioCard>

      {qr.stats ? (
        <StudioCard
          icon={IconChartBar}
          title={t('page.scansTitle')}
          description={t('page.scansDescription')}
        >
          <QrStats stats={qr.stats} />
        </StudioCard>
      ) : null}

      {qr.unlocked ? (
        <Form onSubmit={onSubmit} className="gap-3">
          <StudioCard
            icon={IconPalette}
            title={t('page.customiseTitle')}
            description={t('page.customiseDescription')}
          >
            <CustomiseTiles
              form={form}
              logoUrl={qr.logo_data_url}
              brandColor={qr.brand_color}
              onOpen={setSheet}
            />
          </StudioCard>
          <StudioCard
            icon={IconLetterT}
            title={t('page.textTitle')}
            description={t('page.textDescription')}
          >
            <CardTextControls control={form.control} />
          </StudioCard>

          {/* Pinned above the phone's tabs, so Save is in reach from any card. */}
          <FormActions
            align="between"
            className="sticky-actions -mx-4 border-t-[0.5px] border-[var(--line)] px-4 pt-3 sm:-mx-6 sm:px-6"
          >
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

          <ControlSheet
            open={sheet === 'colors'}
            title={t('page.colors')}
            onClose={closeSheet}
            preview={sheetPreview}
          >
            <ColorControls form={form} />
          </ControlSheet>
          <ControlSheet
            open={sheet === 'shapes'}
            title={t('page.shapes')}
            onClose={closeSheet}
            preview={sheetPreview}
          >
            <ShapeControls control={form.control} />
          </ControlSheet>
          <ControlSheet
            open={sheet === 'logo'}
            title={t('page.logo')}
            onClose={closeSheet}
            preview={sheetPreview}
          >
            <LogoControls control={form.control} />
          </ControlSheet>
        </Form>
      ) : qr.switched_off ? (
        <StudioOff onOpenFeatures={onOpenFeatures} />
      ) : (
        <StudioLocked locale={locale} onOpenPackage={onOpenPackage} />
      )}
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
