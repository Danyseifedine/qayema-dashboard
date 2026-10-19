import { request } from '@/lib/api'
import {
  tempUploadSchema,
  type TempUpload,
  type UploadContext,
} from '@/features/uploads/schemas/temp-upload.schema'
import { shrinkImage } from '@/features/uploads/utils/shrink-image'

type UploadTempImageOptions = {
  context: UploadContext
  /** 0-100, or null while the total size is unknown. */
  onProgress?: (percent: number | null) => void
  signal?: AbortSignal
}

/**
 * Uploads one image to the temp area and returns its key.
 *
 * A large photo is scaled down in the browser first (`shrinkImage`), so less
 * crosses the network and the server has less to decode. The server still
 * optimizes the file with Intervention before parking it, so what comes back
 * describes the optimized result. The key rides along on the next
 * save (`logo_key`, `cover_image_key`, `image_key`); the original is never
 * stored.
 *
 * The key is single-use and expires after about an hour.
 */
export async function uploadTempImage(
  file: File,
  { context, onProgress, signal }: UploadTempImageOptions,
): Promise<TempUpload> {
  const sent = await shrinkImage(file)
  const body = new FormData()
  body.append('file', sent)
  body.append('context', context)

  const result = await request(tempUploadSchema, {
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

  if (sent === file) return result

  // The server measures its saving against the file it got; the owner picked
  // the original, so "97% smaller" stays about that.
  const kept = ((100 - result.saved_percent) / 100) * sent.size
  return { ...result, saved_percent: Math.round((1 - kept / file.size) * 100) }
}
