/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { contrast, MIN_CONTRAST } from '@/shared/utils/color/contrast'

/**
 * The text colours in tokens.css against every surface and wash they are
 * drawn on. axe (the e2e suite's `expectAccessible`) failed on every page
 * while `--faint`, `--muted` and `--accent-text` sat under 4.5:1.
 */
// Read from disk: the test config turns CSS imports off (`css: false`).
const css = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8')

function theme(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`)
  const block = css.slice(start, css.indexOf('\n}', start))
  return Object.fromEntries(
    [...block.matchAll(/^\s*--([a-z0-9-]+):\s*([^;]+);/gm)].map((match) => [match[1], match[2]]),
  )
}

type Rgba = [number, number, number, number]

function parse(value: string): Rgba {
  const hex = /^#([0-9a-f]{6})$/i.exec(value)
  if (hex) {
    return [0, 2, 4].map((at) => parseInt(hex[1]!.slice(at, at + 2), 16)).concat(1) as Rgba
  }
  const rgba = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(value)
  if (!rgba) throw new Error(`Not a colour: ${value}`)
  return [Number(rgba[1]), Number(rgba[2]), Number(rgba[3]), Number(rgba[4])]
}

/** A colour painted over an opaque one, as the browser composites it. */
function over(top: string, bottom: string): string {
  const [r, g, b, alpha] = parse(top)
  const base = parse(bottom)
  return `#${[r, g, b]
    .map((channel, index) =>
      Math.round(channel * alpha + base[index]! * (1 - alpha))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

describe.each([
  ['light', ":root,\nhtml[data-theme='light']"],
  ['dark', "html[data-theme='dark']"],
])('%s theme text colours', (_name, selector) => {
  const tokens = theme(selector)
  const surfaces = [tokens.bg!, tokens.surface!, tokens.field!]
  const washes = surfaces.flatMap((surface) => [
    over(tokens['hover-wash']!, surface),
    over(tokens['accent-wash']!, surface),
  ])
  // The sidebar's active row is a wash, and its package chip another on top.
  const doubleWash = over(tokens['accent-wash']!, over(tokens['accent-wash']!, tokens.surface!))

  it.each(['text', 'muted', 'faint', 'accent-text'])(
    '--%s reads on every surface and wash',
    (token) => {
      for (const background of [...surfaces, ...washes]) {
        const ratio = contrast(over(tokens[token]!, background), background)
        expect(ratio, `--${token} on ${background}`).toBeGreaterThanOrEqual(MIN_CONTRAST)
      }
    },
  )

  it.each(['danger', 'warn', 'success', 'info'])('--status-%s reads on its own wash', (status) => {
    for (const surface of surfaces) {
      const wash = over(tokens[`status-${status}-wash`]!, surface)
      expect(contrast(tokens[`status-${status}`]!, wash), `on ${wash}`).toBeGreaterThanOrEqual(
        MIN_CONTRAST,
      )
    }
  })

  it('--accent-text reads on a wash over a wash', () => {
    expect(contrast(tokens['accent-text']!, doubleWash)).toBeGreaterThanOrEqual(MIN_CONTRAST)
  })
})
