import { useCallback, useState } from 'react'

export type Coordinates = { lat: number; lng: number }

/** A Google Maps link that opens exactly this point. */
export function googleMapsUrlFor({ lat, lng }: Coordinates): string {
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`
}

/**
 * A keyless OpenStreetMap embed centred on the point, with a pin on it.
 *
 * Google's embed needs an API key; this one does not, so a map can be shown
 * without asking the owner to set anything up.
 */
export function mapEmbedUrlFor({ lat, lng }: Coordinates): string {
  const span = 0.004
  const bbox = [lng - span, lat - span / 2, lng + span, lat + span / 2]
    .map((value) => value.toFixed(6))
    .join(',')

  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(6)},${lng.toFixed(6)}`
}

const LAT_LNG = /(-?\d{1,3}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)/

/**
 * Pulls a point out of a map link when one is written into it.
 *
 * Google writes coordinates several ways — `?q=`, `?ll=`, and `/@lat,lng,17z`
 * in a place URL — and a shortened `maps.app.goo.gl` link hides them behind a
 * redirect. Null means "no map to draw", not "bad link".
 */
export function parseMapCoordinates(url: string | null | undefined): Coordinates | null {
  if (!url) return null

  let parsed: URL

  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  const candidates = [
    parsed.searchParams.get('q'),
    parsed.searchParams.get('ll'),
    parsed.searchParams.get('query'),
    // `/maps/place/Name/@33.8886,35.4955,17z/...`
    parsed.pathname.split('/@')[1],
  ]

  for (const candidate of candidates) {
    const match = candidate?.match(LAT_LNG)
    if (!match) continue

    const lat = Number(match[1])
    const lng = Number(match[2])

    // Anything outside the globe came from a zoom level or an id, not a point.
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) continue

    return { lat, lng }
  }

  return null
}

export type CurrentLocationState = {
  locating: boolean
  error: string | null
  /** Asks the browser where we are and hands back a point. */
  locate: (onFound: (coordinates: Coordinates) => void) => void
}

/**
 * The browser's own position, behind the permission prompt.
 *
 * Every failure is turned into a sentence an owner can act on: a refused
 * permission is a different problem from a device that cannot get a fix.
 */
export function useCurrentLocation(): CurrentLocationState {
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const locate = useCallback((onFound: (coordinates: Coordinates) => void) => {
    if (typeof navigator === 'undefined' || navigator.geolocation === undefined) {
      setError('This browser cannot share a location.')
      return
    }

    setError(null)
    setLocating(true)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false)
        onFound({ lat: position.coords.latitude, lng: position.coords.longitude })
      },
      (failure) => {
        setLocating(false)
        setError(describe(failure))
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    )
  }, [])

  return { locating, error, locate }
}

function describe(failure: GeolocationPositionError): string {
  switch (failure.code) {
    case failure.PERMISSION_DENIED:
      return 'Location is blocked for this site. Allow it in your browser, then try again.'
    case failure.POSITION_UNAVAILABLE:
      return 'Your device could not work out where it is. Paste a map link instead.'
    case failure.TIMEOUT:
      return 'That took too long. Try again, or paste a map link instead.'
    default:
      return 'We could not get your location. Paste a map link instead.'
  }
}
