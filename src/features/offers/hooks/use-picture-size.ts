import { useEffect, useState } from 'react'

export type PictureSize = { width: number; height: number }

/** A picture's size in pixels, once it has loaded; null before, or without one. */
export function usePictureSize(url: string | null): PictureSize | null {
  const [found, setFound] = useState<{ url: string; size: PictureSize } | null>(null)

  useEffect(() => {
    if (url === null) return
    let current = true
    const picture = new Image()
    picture.onload = () => {
      if (current && picture.naturalWidth > 0 && picture.naturalHeight > 0) {
        setFound({ url, size: { width: picture.naturalWidth, height: picture.naturalHeight } })
      }
    }
    picture.src = url
    return () => {
      current = false
    }
  }, [url])

  return found !== null && found.url === url ? found.size : null
}

/** Width over height, or null without a size. */
export function ratioOf(size: PictureSize | null): number | null {
  return size === null ? null : size.width / size.height
}
