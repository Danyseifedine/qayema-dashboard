/**
 * Longest side sent to the server. The widest preset is the 1920 px cover, so
 * anything past this is bytes the shared host decodes only to throw away.
 */
export const MAX_UPLOAD_EDGE = 2048

/** A file this small that also fits `MAX_UPLOAD_EDGE` goes as it is. */
export const SMALL_IMAGE_BYTES = 1024 * 1024

const QUALITY = 0.85

/**
 * The types worth redrawing: the ones the server accepts, which the input
 * guard already enforces. Anything else (GIF, SVG, HEIC) goes as it is.
 */
const SHRINKABLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

/** What a redrawn file may come back as, with the extension it is named by. */
const EXTENSIONS: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg' }

type Encode = (type: string) => Promise<Blob>

/**
 * Scales a picked photo down in the browser before it is uploaded, so a
 * 12 MB phone picture crosses slow mobile data as a few hundred KB and the
 * server optimizes a small file instead of a huge one.
 *
 * Returns the original whenever shrinking is not worth it or goes wrong:
 * it must never be the reason an upload fails.
 */
export async function shrinkImage(file: File): Promise<File> {
  if (!SHRINKABLE_TYPES.has(file.type)) return file

  try {
    return (await shrink(file)) ?? file
  } catch {
    return file
  }
}

/** The smaller file, or null when the original should go instead. */
async function shrink(file: File): Promise<File | null> {
  // Phone photos store their rotation in EXIF; without this they come out
  // sideways once redrawn.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })

  try {
    const longest = Math.max(bitmap.width, bitmap.height)
    if (longest <= MAX_UPLOAD_EDGE && file.size < SMALL_IMAGE_BYTES) return null

    // Never upscale: a large file of modest size is only re-encoded.
    const scale = Math.min(1, MAX_UPLOAD_EDGE / longest)
    const encode = draw(
      bitmap,
      Math.max(1, Math.round(bitmap.width * scale)),
      Math.max(1, Math.round(bitmap.height * scale)),
    )

    let blob = await encode('image/webp')
    // Safari cannot encode WebP and quietly hands back a PNG. JPEG is the
    // next best, but it has no transparency (it would turn black), so only a
    // JPEG source takes it.
    if (blob.type !== 'image/webp') {
      if (file.type !== 'image/jpeg') return null
      blob = await encode('image/jpeg')
    }

    const extension = EXTENSIONS[blob.type]
    if (!extension || blob.size >= file.size) return null

    return new File([blob], `${file.name.replace(/\.[^.]*$/, '')}.${extension}`, {
      type: blob.type,
      lastModified: file.lastModified,
    })
  } finally {
    bitmap.close()
  }
}

/** Paints the bitmap at the given size and returns its encoder. */
function draw(bitmap: ImageBitmap, width: number, height: number): Encode {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height)
    paint(canvas.getContext('2d'), bitmap, width, height)
    return (type) => canvas.convertToBlob({ type, quality: QUALITY })
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  paint(canvas.getContext('2d'), bitmap, width, height)
  return (type) =>
    new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the image'))),
        type,
        QUALITY,
      )
    })
}

function paint(
  context: (CanvasDrawImage & CanvasImageSmoothing) | null,
  bitmap: ImageBitmap,
  width: number,
  height: number,
) {
  if (!context) throw new Error('No 2D canvas')
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, width, height)
}
