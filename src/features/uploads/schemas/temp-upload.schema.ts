import { z } from 'zod'
import { t } from '@/lib/i18n'

/**
 * Upload contexts the API accepts, each mapping to a preset in
 * ../qayema/config/image-optimization.php:
 *
 *   logo        contain 400x400,   <= 50 KB
 *   cover_image cover   1920x600,  quality 80
 *   dish        cover   1200x900,  <= 150 KB
 *   generic     contain 1200x1200, <= 200 KB
 *
 * Anything else is rejected with a 422, so the list is closed.
 */
export const UPLOAD_CONTEXTS = ['logo', 'cover_image', 'dish', 'generic'] as const

export type UploadContext = (typeof UPLOAD_CONTEXTS)[number]

/**
 * `POST /api/uploads/temp` answers with a flat body, not a `data` envelope.
 * The size is a pre-formatted display string such as "42.3 KB", never a byte
 * count, so it is shown as-is and never used in arithmetic.
 */
export const tempUploadSchema = z.object({
  key: z.uuid(),
  optimized_size: z.string(),
  saved_percent: z.number(),
})

export type TempUpload = z.infer<typeof tempUploadSchema>

/** A temp-upload key is a UUID. */
const UPLOAD_KEY = /^[a-f0-9-]{36}$/

/** A new image picked in this session: only its key is sent. */
export const uploadedImageSchema = z.object({
  key: z.string().regex(UPLOAD_KEY, { error: () => t('upload.unreadable') }),
  previewUrl: z.string(),
  name: z.string(),
  /** Size of the optimized file, as the server formatted it, e.g. "42.3 KB". */
  optimizedSize: z.string(),
  /** How much the optimizer saved, as a percentage. */
  savedPercent: z.number(),
})

/** The saved image was removed and nothing picked instead. */
export const REMOVED_IMAGE = 'removed' as const

/**
 * What an ImageField holds: a new upload, the saved image removed, or null
 * for "unchanged". The form turns these into `<field>_key` or its delete flag.
 */
export const imageFieldSchema = z.union([uploadedImageSchema, z.literal(REMOVED_IMAGE)]).nullable()

export type UploadedImage = z.infer<typeof uploadedImageSchema>
export type ImageFieldValue = z.infer<typeof imageFieldSchema>

/**
 * What a save sends for one image field: the new upload's key under
 * `keyField`, `deleteField: true` when the saved image was removed, or
 * nothing, which keeps whatever is stored.
 */
export function imageChanges<const K extends string, const D extends string = never>(
  value: ImageFieldValue,
  keyField: K,
  deleteField?: D,
  // NoInfer: the names come from the arguments, never from the payload the
  // result is spread into, which would otherwise widen D to all of its keys.
): NoInfer<{ [P in K]?: string } & { [P in D]?: true }> {
  if (value !== null && value !== REMOVED_IMAGE) {
    return { [keyField]: value.key } as { [P in K]?: string } & { [P in D]?: true }
  }
  if (value === REMOVED_IMAGE && deleteField !== undefined) {
    return { [deleteField]: true } as { [P in K]?: string } & { [P in D]?: true }
  }
  return {}
}
