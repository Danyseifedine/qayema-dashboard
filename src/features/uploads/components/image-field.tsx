import { ImagePlus, Trash2, UploadCloud } from 'lucide-react'
import { useCallback, useId, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import {
  useController,
  type Control,
  type FieldError,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'
import { useTempUpload } from '@/features/uploads/hooks/use-temp-upload'
import {
  REMOVED_IMAGE,
  type ImageFieldValue,
  type UploadedImage,
} from '@/features/uploads/schemas/temp-upload.schema'
import type { UploadContext } from '@/features/uploads/schemas/temp-upload.schema'
import { ACCEPTED_IMAGE_ACCEPT } from '@/lib/security/input-guards'
import { Button, HelperText, Label } from '@/shared/components/ui'
import { cn } from '@/shared/utils/dom/cn'

export type ImageFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  label: ReactNode
  hint: ReactNode
  required?: boolean
  optionalText?: ReactNode
  /** Existing image to show before anything is picked. */
  currentUrl?: string | null
  /** Square for a logo, wide for a cover. */
  aspect?: 'square' | 'wide'
  /**
   * Which optimizer preset the server applies. `logo` fits inside 400x400,
   * `cover_image` crops to 1920x600, `dish` crops to 1200x900.
   */
  context: UploadContext
  /**
   * False for an image the record cannot exist without, such as the logo:
   * offering a remove that the server refuses is a dead end.
   */
  removable?: boolean
}

/**
 * Both states are this tall, so a filled field and an empty one sitting beside
 * each other are the same size rather than one box overhanging the other.
 */
const BOX_HEIGHT = 'min-h-[168px]'

/**
 * Dropzone with preview, following `.ui-uploader` and `.ui-preview` in the
 * portal: dashed border, hatched background, gold on drag.
 *
 * The file is checked against the server's own rules before it leaves the
 * browser, then uploaded to the temp endpoint. Only the returned key is stored
 * in the form, so the original never reaches the model.
 */

export function ImageField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  required,
  optionalText,
  currentUrl,
  aspect = 'wide',
  context,
  removable = true,
}: ImageFieldProps<T>) {
  const { t } = useTranslation()
  const { field, fieldState } = useController({ control, name })
  const value = field.value as ImageFieldValue

  const inputRef = useRef<HTMLInputElement>(null)
  const labelId = useId()
  const [dragging, setDragging] = useState(false)
  const { uploading, progress, error: uploadError, upload, reset } = useTempUpload(context)

  // An upload problem outranks a schema error: it is the newer fact.
  // A bad upload key is reported on `<name>.key`, one level down, so the
  // field's own error carries no message and the save failed silently.
  const fieldError =
    fieldState.error?.message ??
    (fieldState.error as { key?: FieldError } | undefined)?.key?.message
  const error = uploadError ?? fieldError
  // Removing the saved image hides it until the form is saved (or undone);
  // a new pick shows its own preview.
  const picked = value !== null && value !== REMOVED_IMAGE ? value : null
  const preview = value === REMOVED_IMAGE ? null : (picked?.previewUrl ?? currentUrl ?? null)

  const accept = useCallback(
    async (file: File | undefined) => {
      if (!file) return

      const result = await upload(file)
      if (!result) return

      field.onChange({
        key: result.key,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
        optimizedSize: result.optimized_size,
        savedPercent: result.saved_percent,
      } satisfies UploadedImage)
    },
    [field, upload],
  )

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    if (uploading) return
    void accept(event.dataTransfer.files[0])
  }

  const clear = () => {
    if (picked) URL.revokeObjectURL(picked.previewUrl)
    // With a saved image behind the pick, removing means deleting it on save.
    field.onChange(currentUrl ? REMOVED_IMAGE : null)
    reset()
    if (inputRef.current) inputRef.current.value = ''
  }

  const openPicker = () => inputRef.current?.click()

  return (
    <div className="flex flex-col gap-2 pt-2">
      <Label id={labelId} required={required} optionalText={optionalText}>
        {label}
      </Label>

      <input
        ref={inputRef}
        type="file"
        // Named by the field's label, which is not a <label for>: clicking
        // the title should not open the picker.
        aria-labelledby={labelId}
        accept={ACCEPTED_IMAGE_ACCEPT}
        className="sr-only"
        onChange={(event) => void accept(event.target.files?.[0])}
      />

      {preview ? (
        <div
          className={cn(
            'flex flex-col justify-between gap-3 rounded-[14px] p-3',
            'border-[0.5px] border-[var(--line)] bg-[var(--surface)]',
            BOX_HEIGHT,
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={preview}
              alt=""
              className={cn(
                'shrink-0 rounded-[10px] bg-[var(--color-sand)] object-cover',
                aspect === 'square' ? 'size-16' : 'h-16 w-[86px]',
              )}
            />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium tracking-[-0.012em]">
                {picked?.name ?? t('imageField.currentImage')}
              </p>
              {picked ? (
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[var(--muted)]">
                  <span>{picked.optimizedSize}</span>
                  {picked.savedPercent > 0 ? (
                    <span className="rounded-full bg-status-success-wash px-2 py-0.5 text-[11.5px] font-medium text-status-success">
                      {t('imageField.smaller', { percent: picked.savedPercent })}
                    </span>
                  ) : null}
                </p>
              ) : null}
            </div>
          </div>

          {/* Across the full width of the card, not beside the thumbnail: in a
              two-column form the space next to it is too narrow for two
              buttons, and they wrapped into a ragged stack. */}
          <div className={cn('grid gap-2', removable ? 'grid-cols-2' : 'grid-cols-1')}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              block
              onClick={openPicker}
              disabled={uploading}
              loading={uploading}
            >
              {t('imageField.replace')}
            </Button>
            {removable ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                block
                onClick={clear}
                disabled={uploading}
                leadingIcon={<Trash2 className="size-3.5" />}
                className="text-status-danger hover:bg-status-danger-wash"
              >
                {t('imageField.remove')}
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => !uploading && openPicker()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              if (!uploading) openPicker()
            }
          }}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[14px] p-5 text-center',
            BOX_HEIGHT,
            'border-[1.5px] border-dashed transition-all duration-200',
            '[background-image:repeating-linear-gradient(135deg,transparent_0_12px,var(--line-2)_12px_13px)]',
            'bg-[var(--field)]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-on)]',
            dragging
              ? 'border-gold bg-[var(--surface)] shadow-[0_0_0_4px_var(--ring-accent)]'
              : 'border-[var(--line-strong)] hover:border-gold hover:bg-[var(--surface)]',
            uploading && 'pointer-events-none opacity-60',
          )}
        >
          {uploading ? (
            <div className="flex w-full max-w-[220px] flex-col gap-2">
              <div
                role="progressbar"
                aria-label={t('imageField.uploadProgress')}
                aria-valuenow={progress ?? undefined}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-1 overflow-hidden rounded-full bg-[var(--line)]"
              >
                <span
                  className={cn(
                    'block h-full rounded-full bg-gold transition-[width] duration-200',
                    progress === null && 'w-1/3 animate-pulse',
                  )}
                  style={progress === null ? undefined : { width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <span className="grid size-11 place-items-center rounded-xl bg-ink text-[var(--color-paper)]">
              {dragging ? (
                <UploadCloud aria-hidden className="size-[18px]" />
              ) : (
                <ImagePlus aria-hidden className="size-[18px]" />
              )}
            </span>
          )}
          <span className="text-[15px] font-medium tracking-[-0.012em]">
            {uploading ? (
              t('imageField.uploading')
            ) : (
              <Trans
                i18nKey="imageField.drop"
                components={{ browse: <span className="font-display text-accent italic" /> }}
              />
            )}
          </span>
          <span className="text-[12px] leading-[1.5] text-[var(--muted)]">
            {t('imageField.formats')}
          </span>
        </div>
      )}

      {error ? <HelperText tone="error">{error}</HelperText> : <HelperText>{hint}</HelperText>}
    </div>
  )
}
