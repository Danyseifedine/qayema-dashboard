import { ImagePlus, Trash2, UploadCloud } from 'lucide-react'
import { useCallback, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { useTempUpload, type UploadContext } from '@/features/uploads'
import { ACCEPTED_IMAGE_ACCEPT } from '@/lib/security/input-guards'
import { Button, HelperText, Label } from '@/shared/components/ui'
import { cn } from '@/shared/utils/dom/cn'

export type ImageFieldValue = {
  /** Key returned by POST /api/uploads/temp, sent on the next save. */
  key: string
  /** Local object URL; the server returns no preview for a temp upload. */
  previewUrl: string
  name: string
  /** Size of the optimized file, as the server formatted it, e.g. "42.3 KB". */
  optimizedSize: string
  /** How much the optimizer saved, as a percentage. */
  savedPercent: number
} | null

export type ImageFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  label?: ReactNode
  hint?: ReactNode
  required?: boolean
  optionalText?: ReactNode
  disabled?: boolean
  /** Existing image to show before anything is picked. */
  currentUrl?: string | null
  /** Square for a logo, wide for a cover. */
  aspect?: 'square' | 'wide'
  /**
   * Which optimizer preset the server applies. `logo` fits inside 400x400,
   * `cover_image` crops to 1920x600, `dish` crops to 1200x900.
   */
  context: UploadContext
  className?: string
}

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
  disabled,
  currentUrl,
  aspect = 'wide',
  context,
  className,
}: ImageFieldProps<T>) {
  const { field, fieldState } = useController({ control, name })
  const value = field.value as ImageFieldValue

  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const { uploading, progress, error: uploadError, upload, reset } = useTempUpload(context)

  // An upload problem outranks a schema error: it is the newer fact.
  const error = uploadError ?? fieldState.error?.message
  const preview = value?.previewUrl ?? currentUrl ?? null

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
      } satisfies NonNullable<ImageFieldValue>)
    },
    [field, upload],
  )

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    if (disabled || uploading) return
    void accept(event.dataTransfer.files[0])
  }

  const clear = () => {
    if (value?.previewUrl) URL.revokeObjectURL(value.previewUrl)
    field.onChange(null)
    reset()
    if (inputRef.current) inputRef.current.value = ''
  }

  const openPicker = () => inputRef.current?.click()

  return (
    <div className={cn('flex flex-col gap-2 pt-2', className)}>
      {label ? (
        <Label required={required} optionalText={optionalText}>
          {label}
        </Label>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_ACCEPT}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => void accept(event.target.files?.[0])}
      />

      {preview ? (
        <div className="flex items-stretch overflow-hidden rounded-[14px] border-[0.5px] border-[var(--line)] bg-[var(--surface)]">
          <img
            src={preview}
            alt=""
            className={cn(
              'shrink-0 bg-[var(--color-sand)] object-cover',
              aspect === 'square' ? 'size-[140px]' : 'h-[140px] w-[200px]',
            )}
          />
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-2.5 p-4">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium tracking-[-0.012em]">
                {value?.name ?? 'Current image'}
              </p>
              {value ? (
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[12px] text-[var(--muted)]">
                  <span>{value.optimizedSize}</span>
                  {value.savedPercent > 0 ? (
                    <span className="rounded-full bg-status-success-wash px-2 py-0.5 text-[11.5px] font-medium text-status-success">
                      {value.savedPercent}% smaller
                    </span>
                  ) : null}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"

                onClick={openPicker}
                disabled={disabled || uploading}
                loading={uploading}
              >
                Replace
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"

                onClick={clear}
                disabled={disabled || uploading}
                leadingIcon={<Trash2 className="size-3.5" />}
                className="text-status-danger hover:bg-status-danger-wash"
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled || undefined}
          onClick={() => !disabled && !uploading && openPicker()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              if (!disabled && !uploading) openPicker()
            }
          }}
          onDragOver={(event) => {
            event.preventDefault()
            if (!disabled) setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'flex cursor-pointer flex-col items-center gap-3 rounded-[14px] p-7 text-center',
            'border-[1.5px] border-dashed transition-all duration-200',
            '[background-image:repeating-linear-gradient(135deg,transparent_0_12px,var(--line-2)_12px_13px)]',
            'bg-[var(--field)]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-on)]',
            dragging
              ? 'border-gold bg-[var(--surface)] shadow-[0_0_0_4px_var(--ring-accent)]'
              : 'border-[var(--line-strong)] hover:border-gold hover:bg-[var(--surface)]',
            (disabled || uploading) && 'pointer-events-none opacity-60',
          )}
        >
          {uploading ? (
            <div className="flex w-full max-w-[220px] flex-col gap-2">
              <div
                role="progressbar"
                aria-label="Upload progress"
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
            {uploading ? 'Uploading…' : 'Drop an image or '}
            {!uploading ? <span className="font-display text-accent italic">browse</span> : null}
          </span>
          <span className="text-[12px] leading-[1.5] text-[var(--muted)]">
            JPEG, PNG or WebP · up to 10 MB
          </span>
        </div>
      )}

      {error ? (
        <HelperText tone="error">{error}</HelperText>
      ) : hint ? (
        <HelperText>{hint}</HelperText>
      ) : null}
    </div>
  )
}
