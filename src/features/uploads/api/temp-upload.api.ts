import { request } from '@/lib/api'
import {
  tempUploadSchema,
  type TempUpload,
  type UploadContext,
} from '../schemas/temp-upload.schema'

export type UploadTempImageOptions = {
  context: UploadContext
  /** 0-100, or null while the total size is unknown. */
  onProgress?: (percent: number | null) => void
  signal?: AbortSignal
}

/**
 * Uploads one image to the temp area and returns its key.
 *
 * The server optimizes the file with Intervention before parking it, so what
 * comes back describes the optimized result. The key rides along on the next
 * save (`logo_key`, `cover_image_key`, `image_key`); the original is never
 * stored.
 *
 * The key is single-use and expires after about an hour.
 */
export async function uploadTempImage(
  file: File,
  { context, onProgress, signal }: UploadTempImageOptions,
): Promise<TempUpload> {
  const body = new FormData()
  body.append('file', file)
  body.append('context', context)

  return request(tempUploadSchema, {
    method: 'POST',
    url: '/api/uploads/temp',
    data: body,
    signal,
    // Content-Type is deliberately unset so the browser adds the multipart
    // boundary itself.
    onUploadProgress: onProgress
      ? (event) => {
          onProgress(event.total ? Math.round((event.loaded / event.total) * 100) : null)
        }
      : undefined,
  })
}
