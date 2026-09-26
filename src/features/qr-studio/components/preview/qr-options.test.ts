import { describe, expect, it } from 'vitest'
import type { QrDesign } from '../../schemas/qr.schema'
import { contrast, qrOptions, weakParts } from './qr-options'

/**
 * The same cases as ../qayema/tests/Unit/Services/QrStyleTest.php, with the
 * same expected options, so the preview and the printed card cannot drift.
 */

const URL = 'https://qayema.test/olive?qr=1'
const LOGO = 'data:image/png;base64,iVBORw0KGgo='

function simple(overrides: Partial<QrDesign> = {}): QrDesign {
  return {
    dot_style: 'square',
    dot_color: '#000000',
    dot_gradient: null,
    gradient_type: 'linear',
    corner_style: 'square',
    corner_color: '#000000',
    eye_style: 'square',
    eye_color: '#000000',
    background: '#FFFFFF',
    logo: false,
    logo_size: 'medium',
    card_theme: 'light',
    title: 'Olive',
    subtitle: null,
    cta: null,
    show_url: true,
    ...overrides,
  }
}

describe('qrOptions', () => {
  it('draws the simple QR', () => {
    expect(qrOptions(simple(), URL, null)).toEqual({
      data: URL,
      margin: 0,
      qrOptions: { errorCorrectionLevel: 'M' },
      dotsOptions: { type: 'square', color: '#000000' },
      cornersSquareOptions: { type: 'square', color: '#000000' },
      cornersDotOptions: { type: 'square', color: '#000000' },
      backgroundOptions: { color: '#FFFFFF' },
    })
  })

  it('makes a second colour a linear gradient, corner to corner', () => {
    const options = qrOptions(simple({ dot_color: '#1F6FEB', dot_gradient: '#7C3AED' }), URL, null)

    expect(options.dotsOptions).toEqual({
      type: 'square',
      gradient: {
        type: 'linear',
        rotation: Math.PI / 4,
        colorStops: [
          { offset: 0, color: '#1F6FEB' },
          { offset: 1, color: '#7C3AED' },
        ],
      },
    })
  })

  it('gives a radial gradient no angle', () => {
    const options = qrOptions(
      simple({ dot_gradient: '#7C3AED', gradient_type: 'radial' }),
      URL,
      null,
    )

    expect(options.dotsOptions?.gradient?.type).toBe('radial')
    expect(options.dotsOptions?.gradient?.rotation).toBe(0)
  })

  it('places a logo and raises error correction', () => {
    const options = qrOptions(simple({ logo: true, logo_size: 'large' }), URL, LOGO)

    expect(options.qrOptions?.errorCorrectionLevel).toBe('H')
    expect(options.image).toBe(LOGO)
    expect(options.imageOptions).toEqual({ hideBackgroundDots: true, imageSize: 0.45, margin: 4 })
  })

  it('draws the plain code when the logo asked for is not there', () => {
    const options = qrOptions(simple({ logo: true }), URL, null)

    expect(options.qrOptions?.errorCorrectionLevel).toBe('M')
    expect(options).not.toHaveProperty('image')
    expect(options).not.toHaveProperty('imageOptions')
  })

  it('leaves out a logo that is there but switched off', () => {
    expect(qrOptions(simple({ logo: false }), URL, LOGO)).not.toHaveProperty('image')
  })

  it('maps each logo size', () => {
    for (const [size, share] of [
      ['small', 0.25],
      ['medium', 0.35],
      ['large', 0.45],
    ] as const) {
      expect(
        qrOptions(simple({ logo: true, logo_size: size }), URL, LOGO).imageOptions?.imageSize,
      ).toBe(share)
    }
  })

  it('passes corner and centre shapes and colours through', () => {
    const options = qrOptions(
      simple({
        corner_style: 'extra-rounded',
        corner_color: '#111418',
        eye_style: 'dot',
        eye_color: '#EA4335',
        background: '#F4F5F7',
      }),
      URL,
      null,
    )

    expect(options.cornersSquareOptions).toEqual({ type: 'extra-rounded', color: '#111418' })
    expect(options.cornersDotOptions).toEqual({ type: 'dot', color: '#EA4335' })
    expect(options.backgroundOptions).toEqual({ color: '#F4F5F7' })
  })
})

describe('weakParts', () => {
  it('passes the simple QR', () => {
    expect(weakParts(simple())).toEqual([])
  })

  it('flags red corner centres, which a reader failed on in testing', () => {
    // About 3.9:1 on white — it clears the 3:1 we first planned, and still
    // stopped the code decoding. This is why the bar is 4.5:1.
    expect(contrast('#EA4335', '#FFFFFF')).toBeGreaterThan(3)
    expect(weakParts(simple({ eye_color: '#EA4335' }))).toEqual(['corner centres'])
  })

  it('passes the blue and violet that decoded fine', () => {
    expect(weakParts(simple({ dot_color: '#1F6FEB', dot_gradient: '#7C3AED' }))).toEqual([])
  })

  it('checks every coloured part, including the second gradient colour', () => {
    expect(
      weakParts(
        simple({
          dot_color: '#DDDDDD',
          dot_gradient: '#EEEEEE',
          corner_color: '#CCCCCC',
          eye_color: '#E0E0E0',
        }),
      ),
    ).toEqual(['dots', 'gradient', 'corner frames', 'corner centres'])
  })

  it('measures against the background, not against white', () => {
    // Light dots on a dark background: fine for contrast.
    expect(weakParts(simple({ dot_color: '#FFFFFF', background: '#000000' }))).not.toContain('dots')
  })
})

describe('contrast', () => {
  it('runs from 1 to 21 and is the same either way round', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
    expect(contrast('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5)
    expect(contrast('#1F6FEB', '#FFFFFF')).toBeCloseTo(contrast('#FFFFFF', '#1F6FEB'), 10)
  })
})
