import { zodResolver } from '@hookform/resolvers/zod'
import { Copy, Download, ExternalLink, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { ErrorState, toast } from '@/shared/components/feedback'
import { Form, FormActions, FormSection } from '@/shared/components/forms'
import { Alert, Button } from '@/shared/components/ui'
import { CardControls } from '../components/editor/controls/card-controls'
import { ColourControls } from '../components/editor/controls/colour-controls'
import { LogoControls } from '../components/editor/controls/logo-controls'
import { ShapeControls } from '../components/editor/controls/shape-controls'
import { downloadQr } from '../components/preview/qr-download'
import { qrOptions, weakParts, type WeakPart } from '../components/preview/qr-options'
import { QrPreview } from '../components/preview/qr-preview'
import { QrStats } from '../components/stats/qr-stats'
import { useQr, useSaveQr } from '../hooks/use-qr'
import {
  qrFormSchema,
  toDesign,
  toFormValues,
  type Qr,
  type QrFormValues,
} from '../schemas/qr.schema'

/** Everything that changes how the code looks — what "Reset to simple" puts back. */
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
export function QrPage() {
  const qr = useQr()

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h2 className="font-display text-[19px] leading-tight">QR code</h2>
        <p className="mt-1 text-[13px] leading-snug text-[var(--muted)]">
          Guests scan this to open your menu. Download it as it is, or make it your own.
        </p>
      </div>

      {qr.isPending ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="h-[380px] animate-pulse rounded-[18px] bg-[var(--hover-wash)]" />
          <div className="h-[520px] animate-pulse rounded-[18px] bg-[var(--hover-wash)]" />
        </div>
      ) : qr.isError ? (
        <ErrorState description={qr.error.message} onRetry={() => void qr.refetch()} />
      ) : (
        <QrStudio qr={qr.data} />
      )}
    </div>
  )
}

function QrStudio({ qr }: { qr: Qr }) {
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
      toast.error('Could not download the QR code')
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
      toast.success('Link copied')
    } catch {
      toast.error('Could not copy the link')
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
          <Alert variant="warning" title="This may not scan">
            The {listParts(weak)} {weak.length === 1 ? 'is' : 'are'} too close to the background
            colour for every phone to read. Pick a darker colour or a lighter background.
          </Alert>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <Button
            leadingIcon={<Download aria-hidden className="size-4" />}
            loading={downloading === 'png'}
            disabled={downloading !== null}
            onClick={() => void download('png')}
          >
            PNG
          </Button>
          <Button
            variant="secondary"
            leadingIcon={<Download aria-hidden className="size-4" />}
            loading={downloading === 'svg'}
            disabled={downloading !== null}
            onClick={() => void download('svg')}
          >
            SVG
          </Button>
        </div>
        <p className="text-[12px] leading-snug text-[var(--muted)]">
          PNG for sharing and most printers. SVG stays sharp at any size — use it for a large print.
        </p>

        <div className="flex items-center gap-2 rounded-[12px] border-[0.5px] border-[var(--line)] bg-[var(--surface)] py-1.5 ps-3.5 pe-1.5">
          <span dir="ltr" className="min-w-0 flex-1 truncate text-[13px] text-[var(--muted)]">
            {qr.display_url}
          </span>
          <Button
            variant="ghost"
            size="sm"
            leadingIcon={<Copy aria-hidden className="size-4" />}
            onClick={() => void copyLink()}
          >
            Copy link
          </Button>
        </div>

        {qr.card_url ? (
          <a
            href={qr.card_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-[var(--gold-on)] underline-offset-4 hover:underline"
          >
            <ExternalLink aria-hidden className="size-4" />
            Open the printable table card
          </a>
        ) : null}
        {qr.card_url && dirty ? (
          <p className="text-[12px] leading-snug text-[var(--muted)]">
            The card shows your saved design. Save to see these changes on it.
          </p>
        ) : null}
      </aside>

      <div className="flex min-w-0 flex-col gap-4">
        {qr.stats ? (
          <FormSection title="Scans" description="Menu visits that came through this QR code.">
            <QrStats stats={qr.stats} />
          </FormSection>
        ) : null}

        {qr.unlocked ? (
          <Form onSubmit={onSubmit}>
            <FormSection title="Colours">
              <ColourControls form={form} />
            </FormSection>
            <FormSection title="Shapes">
              <ShapeControls control={form.control} />
            </FormSection>
            <FormSection title="Logo">
              <LogoControls control={form.control} hasLogo={qr.logo_data_url !== null} />
            </FormSection>
            <FormSection
              title="Printable card"
              description="The table card around the code. It does not change how the code scans."
            >
              <CardControls control={form.control} brandColor={qr.brand_color} />
            </FormSection>

            <FormActions className="justify-between">
              <Button
                variant="ghost"
                leadingIcon={<RotateCcw aria-hidden className="size-4" />}
                onClick={resetToSimple}
                disabled={save.isPending}
              >
                Reset to simple
              </Button>
              <Button type="submit" loading={save.isPending} disabled={!dirty}>
                Save
              </Button>
            </FormActions>
          </Form>
        ) : (
          <Alert variant="info" title="Customizing is not on your package">
            Your QR code works as it is. Colours, shapes, a logo and the printable card come with a
            package that includes the QR studio.
          </Alert>
        )}
      </div>
    </div>
  )
}

function listParts(parts: WeakPart[]): string {
  if (parts.length === 1) return parts[0]!
  return `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`
}
