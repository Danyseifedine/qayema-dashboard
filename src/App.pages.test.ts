import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * What keeps each page's code out of the first download: App.tsx loads a
 * page from its feature's `pages/index.ts`, and a feature's barrel
 * (`index.ts`, what other features import) never exports a page. A page in a
 * barrel comes along with every hook or key another feature imports from it,
 * which once put the Menu and Package pages (and drag and drop) in the shell.
 */
const FEATURES = join(process.cwd(), 'src/features')

const features = readdirSync(FEATURES)

describe('pages stay out of the first download', () => {
  it.each(features.filter((feature) => existsSync(join(FEATURES, feature, 'index.ts'))))(
    'the %s barrel exports no page',
    (feature) => {
      const barrel = readFileSync(join(FEATURES, feature, 'index.ts'), 'utf8')

      expect(barrel).not.toMatch(/\/pages\//)
    },
  )

  it('App.tsx takes every page from a pages entry, never a barrel', () => {
    const app = readFileSync(join(process.cwd(), 'src/App.tsx'), 'utf8')
    const imported = [...app.matchAll(/import\('(@\/features\/[^']+)'\)/g)].map((match) => match[1])

    expect(imported.length).toBeGreaterThan(0)
    for (const path of imported) expect(path).toMatch(/^@\/features\/[a-z-]+\/pages$/)
  })
})
