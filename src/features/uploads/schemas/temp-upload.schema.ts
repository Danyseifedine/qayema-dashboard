import { z } from 'zod'

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
 * The two size fields are pre-formatted display strings such as "42.3 KB",
 * never byte counts, so they are shown as-is and never used in arithmetic.
 */
export const tempUploadSchema = z.object({
  key: z.uuid(),
  original_size: z.string(),
  optimized_size: z.string(),
  saved_percent: z.number(),
})

export type TempUpload = z.infer<typeof tempUploadSchema>
