import { describe, expect, it } from 'vitest'
import { googleMapsUrlFor, mapEmbedUrlFor, parseMapCoordinates } from './use-current-location'

describe('parseMapCoordinates', () => {
  it('reads a point out of every shape Google writes', () => {
    expect(parseMapCoordinates('https://www.google.com/maps?q=33.8886,35.4955')).toEqual({
      lat: 33.8886,
      lng: 35.4955,
    })
    expect(parseMapCoordinates('https://maps.google.com/?ll=33.8886,35.4955&z=17')).toEqual({
      lat: 33.8886,
      lng: 35.4955,
    })
    expect(
      parseMapCoordinates('https://www.google.com/maps/place/Beit/@33.8886,35.4955,17z/data=xyz'),
    ).toEqual({ lat: 33.8886, lng: 35.4955 })
  })

  it('handles a southern, western point', () => {
    expect(parseMapCoordinates('https://www.google.com/maps?q=-33.8688,-151.2093')).toEqual({
      lat: -33.8688,
      lng: -151.2093,
    })
  })

  it('gives up on a link that hides its coordinates', () => {
    // A shortened share link resolves server-side, so there is nothing to read.
    expect(parseMapCoordinates('https://maps.app.goo.gl/abc123')).toBeNull()
    expect(parseMapCoordinates('https://www.google.com/maps/place/Beit+Qayema')).toBeNull()
  })

  it('refuses anything that is not a point', () => {
    expect(parseMapCoordinates(null)).toBeNull()
    expect(parseMapCoordinates('')).toBeNull()
    expect(parseMapCoordinates('not a url')).toBeNull()
    // Out of range: this came from a zoom level or an id, not a place.
    expect(parseMapCoordinates('https://www.google.com/maps?q=999,999')).toBeNull()
  })
})

describe('googleMapsUrlFor', () => {
  it('writes a link that opens the exact point', () => {
    expect(googleMapsUrlFor({ lat: 33.888601, lng: 35.495479 })).toBe(
      'https://www.google.com/maps?q=33.888601,35.495479',
    )
  })

  it('round-trips through the parser', () => {
    const point = { lat: 33.8886, lng: 35.4955 }
    expect(parseMapCoordinates(googleMapsUrlFor(point))).toEqual(point)
  })
})

describe('mapEmbedUrlFor', () => {
  it('centres the box on the point and pins it', () => {
    const url = new URL(mapEmbedUrlFor({ lat: 33.8886, lng: 35.4955 }))

    expect(url.origin).toBe('https://www.openstreetmap.org')
    expect(url.searchParams.get('marker')).toBe('33.888600,35.495500')

    const [minLng, minLat, maxLng, maxLat] = (url.searchParams.get('bbox') ?? '')
      .split(',')
      .map(Number)

    expect(minLng!).toBeLessThan(35.4955)
    expect(maxLng!).toBeGreaterThan(35.4955)
    expect(minLat!).toBeLessThan(33.8886)
    expect(maxLat!).toBeGreaterThan(33.8886)
  })
})
