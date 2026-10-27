import { describe, expect, it } from 'vitest'
import { pictureFit, shapeOf, showsWhole, tooSmall } from '@/features/offers/utils/picture-fit'

describe('pictureFit', () => {
  it('lets a picture close to the shape be', () => {
    expect(pictureFit(1.8, 'rectangle', ['rectangle', 'square'])).toBeNull()
    expect(pictureFit(0.8, 'tall', ['square', 'tall'])).toBeNull()
    expect(pictureFit(null, 'square', ['square'])).toBeNull()
  })

  it('says a picture a little off is trimmed at its edges', () => {
    // 16:9 in a 2:1 banner: a strip off its top and bottom.
    expect(pictureFit(1.6, 'rectangle', ['rectangle', 'square'])).toEqual({
      mode: 'trimmed',
      way: 'tall',
      better: null,
    })
  })

  it('says a picture far off shows whole, and the shape that fits it best', () => {
    expect(pictureFit(0.5, 'rectangle', ['rectangle', 'square'])).toEqual({
      mode: 'whole',
      way: 'tall',
      better: 'square',
    })
    expect(pictureFit(2, 'tall', ['square', 'tall'])).toEqual({
      mode: 'whole',
      way: 'wide',
      better: 'square',
    })
    // The ad has no other shape to offer.
    expect(pictureFit(0.75, 'rectangle', ['rectangle'])).toMatchObject({ better: null })
  })

  it('never crops a picture alone more than a hair', () => {
    expect(pictureFit(1.6, 'rectangle', ['rectangle'], true)).toMatchObject({ mode: 'whole' })
    expect(showsWhole(1.9, 'rectangle', true)).toBe(true)
    expect(showsWhole(1.97, 'rectangle', true)).toBe(false)
  })

  it('follows the menu: past 1.35 times off, a picture with words shows whole', () => {
    expect(showsWhole(2 / 1.35, 'rectangle', false)).toBe(false)
    expect(showsWhole(1.4, 'rectangle', false)).toBe(true)
    expect(showsWhole(null, 'square', false)).toBe(false)
  })
})

describe('tooSmall', () => {
  it('flags a picture under 1000 pixels on its longer side', () => {
    expect(tooSmall({ width: 800, height: 600 })).toBe(true)
    expect(tooSmall({ width: 1200, height: 400 })).toBe(false)
    expect(tooSmall(null)).toBe(false)
  })
})

describe('shapeOf', () => {
  it('takes the banner and pop-up shapes picked, and a rectangle for an ad', () => {
    const shapes = { banner_shape: 'square', popup_shape: 'tall' } as const
    expect(shapeOf('banner', shapes)).toBe('square')
    expect(shapeOf('popup', shapes)).toBe('tall')
    expect(shapeOf('ad', shapes)).toBe('rectangle')
  })
})
