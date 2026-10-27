import { zodResolver } from '@hookform/resolvers/zod'
import type { TFunction } from 'i18next'
import {
  IconChartBar,
  IconChevronRight,
  IconCircleDotFilled,
  IconCopy,
  IconDownload,
  IconExternalLink,
  IconPalette,
  IconLetterT,
  IconRotate,
} from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { copyWithToast, toast } from '@/shared/components/feedback'
import type { Locale } from '@/shared/constants/locales'
import { Form, FormActions } from '@/shared/components/forms'
import {
  Alert,
  Button,
  FieldTrailingButton,
  HelperText,
  Input,
  SectionCard,
} from '@/shared/components/ui'
import { CardTextControls } from '@/features/qr/components/controls/card-text-controls'
import { ColorControls } from '@/features/qr/components/controls/color-controls'
import { LogoControls } from '@/features/qr/components/controls/logo-controls'
import { ShapeControls } from '@/features/qr/components/controls/shape-controls'
import { ControlSheet } from '@/features/qr/components/studio/control-sheet'
import { CustomiseTiles, type StudioSheet } from '@/features/qr/components/studio/customise-tiles'
import { StudioLocked } from '@/features/qr/components/studio/studio-locked'
import { StudioOff } from '@/features/qr/components/studio/studio-off'
import { downloadQr } from '@/features/qr/utils/qr-download'
import { qrOptions, weakParts, type QrLook, type WeakPart } from '@/features/qr/utils/qr-options'
import { QrPreview } from '@/features/qr/components/preview/qr-preview'
import { QrStats } from '@/features/qr/components/stats/qr-stats'
import { useSaveQr } from '@/features/qr/hooks/use-qr'
import {
  qrFormSchema,
  toDesign,
  toFormValues,
  type Qr,
  type QrFormValues,
} from '@/features/qr/schemas/qr.schema'
import { QR_GROUND } from '@/shared/constants/pictures'

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
] as const satisfies readonly (keyof QrLook)[]

export type QrStudioProps = {
  qr: Qr
  locale: Locale
  /** Opens the Features page, where the owner switches the studio back on. */
  onOpenFeatures: () => void
  /** Opens the Package page, for a package without the studio. */
  onOpenPackage: () => void
}

/**
 * The code, live, with its downloads, the menu link and the scans, then
 * everything that makes it the restaurant's own: on a package with the
 * studio, the customisation and the card's text; otherwise why it is off.
 */
export function QrStudio({ qr, locale, onOpenFeatures, onOpenPackage }: QrStudioProps) {
  const { t } = useTranslation('qr')
  const save = useSaveQr()
  const [downloading, setDownloading] = useState<'png' | 'svg' | null>(null)
  const [sheet, setSheet] = useState<StudioSheet | null>(null)

  const form = useForm<QrFormValues>({
    resolver: zodResolver(qrFormSchema),
    defaultValues: toFormValues(qr.settings),
  })

  // The preview follows what is on screen, saved or not: only the fields
  // that change the code, so typing the card's words never redraws it.
  const watched = useWatch({ control: form.control, name: LOOK_FIELDS })
  const look = useMemo(
    () => Object.fromEntries(LOOK_FIELDS.map((field, index) => [field, watched[index]])) as QrLook,
    [watched],
  )
  const options = useMemo(
    () => qrOptions(look, qr.url, qr.logo_data_url),
    [look, qr.url, qr.logo_data_url],
  )
  const weak = weakParts(look)
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
          src={QR_GROUND}
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

      <SectionCard
        heading="caps"
        icon={<IconCircleDotFilled className="size-[18px]" stroke={1.8} />}
        title={t('page.linkTitle')}
      >
        <Input
          readOnly
          value={qr.display_url}
          aria-label={t('page.linkTitle')}
          dir="ltr"
          className="truncate text-start"
          trailing={
            <FieldTrailingButton label={t('page.copyLink')} onClick={() => void copyLink()}>
              <IconCopy aria-hidden />
            </FieldTrailingButton>
          }
        />
        {qr.card_url ? (
          <a
            href={qr.card_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-tile text-[13.5px] font-medium text-accent underline-offset-4 hover:underline focus-ring"
          >
            <IconExternalLink aria-hidden className="size-[18px] shrink-0" />
            <span className="min-w-0 flex-1">{t('page.openCard')}</span>
            <IconChevronRight aria-hidden className="size-4 shrink-0 rtl:rotate-180" />
          </a>
        ) : null}
        {qr.card_url && dirty ? <HelperText>{t('page.cardUnsaved')}</HelperText> : null}
      </SectionCard>

      {qr.stats ? (
        <SectionCard
          heading="caps"
          icon={<IconChartBar className="size-[18px]" stroke={1.8} />}
          title={t('page.scansTitle')}
          description={t('page.scansDescription')}
        >
          <QrStats stats={qr.stats} />
        </SectionCard>
      ) : null}

      {qr.unlocked ? (
        <Form onSubmit={onSubmit} className="gap-3">
          <SectionCard
            heading="caps"
            icon={<IconPalette className="size-[18px]" stroke={1.8} />}
            title={t('page.customiseTitle')}
            description={t('page.customiseDescription')}
          >
            <CustomiseTiles
              form={form}
              logoUrl={qr.logo_data_url}
              brandColor={qr.brand_color}
              onOpen={setSheet}
            />
          </SectionCard>
          <SectionCard
            heading="caps"
            icon={<IconLetterT className="size-[18px]" stroke={1.8} />}
            title={t('page.textTitle')}
            description={t('page.textDescription')}
          >
            <CardTextControls control={form.control} />
          </SectionCard>

          {/* Pinned above the phone's tabs, so Save is in reach from any card. */}
          <FormActions align="between" className="sticky-actions pt-3">
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
