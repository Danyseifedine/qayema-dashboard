import { describe, expect, it } from 'vitest'
import { hexToHsv, hsvToHex } from '@/shared/utils/color/hsv'

describe('hexToHsv', () => {
  it('reads the primaries and the greys', () => {
    expect(hexToHsv('#FF0000')).toEqual({ h: 0, s: 1, v: 1 })
    expect(hexToHsv('#00FF00')).toEqual({ h: 120, s: 1, v: 1 })
    expect(hexToHsv('#0000FF')).toEqual({ h: 240, s: 1, v: 1 })
    expect(hexToHsv('#000000')).toEqual({ h: 0, s: 0, v: 0 })
    expect(hexToHsv('#ffffff')).toEqual({ h: 0, s: 0, v: 1 })
  })

  it('reads a hue that wraps past red', () => {
    expect(hexToHsv('#FF00FF').h).toBe(300)
  })
})

describe('hsvToHex', () => {
  it('writes capitals and comes back to the same colour', () => {
    for (const hex of ['#C8A24A', '#123456', '#F8D38D', '#000000', '#FFFFFF', '#7F7F7F']) {
      expect(hsvToHex(hexToHsv(hex))).toBe(hex)
    }
  })

  it('makes a pure hue at full saturation and brightness', () => {
    expect(hsvToHex({ h: 60, s: 1, v: 1 })).toBe('#FFFF00')
    expect(hsvToHex({ h: 360, s: 1, v: 1 })).toBe('#FF0000')
    expect(hsvToHex({ h: 200, s: 0, v: 0.5 })).toBe('#808080')
  })
})
