import { useCallback, useRef, useState } from 'react'
import { checkImageFile } from '@/lib/security/input-guards'
import { ApiError } from '@/shared/types/api'
import { uploadTempImage } from '../api/temp-upload.api'
import type { TempUpload, UploadContext } from '../schemas/temp-upload.schema'

export type UploadState = {
  uploading: boolean
  /** 0-100 while the bytes are in flight, null when the size is unknown. */
  progress: number | null
  error: string | null
  /** The last successful upload, for the preview's size summary. */
  result: TempUpload | null
}

const IDLE: UploadState = { uploading: false, progress: null, error: null, result: null }

/**
 * Uploads one image to the temp area.
 *
 * The file is checked against the server's own rules first, so an obviously
 * bad file never leaves the browser. A 429 is surfaced with its wait time and
 * deliberately not retried: the uploads limiter feeds an IP auto-ban, so
 * hammering it would lock the owner out.
 */
export function useTempUpload(context: UploadContext) {
  const [state, setState] = useState<UploadState>(IDLE)
  const controllerRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setState(IDLE)
  }, [])

  const upload = useCallback(
    async (file: File): Promise<TempUpload | null> => {
      const rejection = await checkImageFile(file)
      if (rejection) {
        setState({ ...IDLE, error: rejection.message })
        return null
      }

      // A second pick replaces the first rather than racing it.
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller

      setState({ uploading: true, progress: 0, error: null, result: null })

      try {
        const result = await uploadTempImage(file, {
          context,
          signal: controller.signal,
          onProgress: (progress) =>
            setState((current) => (current.uploading ? { ...current, progress } : current)),
        })

        setState({ uploading: false, progress: 100, error: null, result })
        return result
      } catch (error) {
        // An aborted request was replaced on purpose; it is not a failure.
        if (controller.signal.aborted) return null

        setState({ ...IDLE, error: messageFor(error) })
        return null
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null
      }
    },
    [context],
  )

  return { ...state, upload, reset }
}

function messageFor(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'That image could not be uploaded. Please try again.'
  }

  if (error.isRateLimited) {
    const wait = error.retryAfter
    return wait === null
      ? 'Too many uploads in a row. Wait a moment before trying again.'
      : `Too many uploads in a row. Try again in ${wait} seconds.`
  }

  // A body PHP refused outright never reaches validation, so it arrives as a
  // 413 rather than a 422 about the file field.
  if (error.status === 413 || error.code === 'payload_too_large') {
    return 'That image is too large. Images must be 10 MB or smaller.'
  }

  // A 422 names the file field; show the server's own wording.
  if (error.isValidation) {
    const first = error.errors?.file?.[0] ?? error.errors?.context?.[0]
    if (first) return first
  }

  return error.message
}
