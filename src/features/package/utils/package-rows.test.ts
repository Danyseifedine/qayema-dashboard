import { describe, expect, it } from 'vitest'
import { highlightsOf } from '@/features/package/utils/package-rows'
import type { Package } from '@/features/package/schemas/package.schema'
import { EMPTY_PLAN } from '@/test/factories/session'

function pkg(slug: string, features: Partial<Package['features']>): Package {
  return {
    id: slug.length,
    slug,
    name: { en: slug, ar: null },
    description: { en: null, ar: null },
    price_cents: 0,
    currency: 'USD',
    is_contact_only: false,
    is_default: false,
    is_featured: false,
    features: {
      dish_limit: 40,
      category_limit: 8,
      social_link_limit: 1,
      ...EMPTY_PLAN,
      ...features,
    },
  }
}

describe('highlightsOf', () => {
  it('lists the limits alone for a package with nothing switched on', () => {
    const { base, rows } = highlightsOf(pkg('free', {}), undefined)

    expect(base).toBeNull()
    expect(rows.map((row) => row.key)).toEqual([
      'dish_limit',
      'category_limit',
      'social_link_limit',
    ])
  })

  it('builds on the package before when it has everything that one has', () => {
    const free = pkg('free', {})
    const pro = pkg('pro', { dish_limit: 150, appearance: true })

    const { base, rows } = highlightsOf(pro, free)

    expect(base?.slug).toBe('free')
    expect(rows.map((row) => row.key)).toEqual(['dish_limit', 'appearance'])
  })

  it('treats unlimited as more than any number', () => {
    const { base, rows } = highlightsOf(pkg('custom', { dish_limit: null }), pkg('free', {}))

    expect(base?.slug).toBe('free')
    expect(rows.map((row) => row.key)).toEqual(['dish_limit'])
  })

  it('lists everything when it lacks something the one before has', () => {
    const pro = pkg('pro', { appearance: true })
    const odd = pkg('odd', { qr_studio: true })

    const { base, rows } = highlightsOf(odd, pro)

    expect(base).toBeNull()
    expect(rows.map((row) => row.key)).toContain('qr_studio')
    expect(rows.map((row) => row.key)).not.toContain('appearance')
  })

  it('does not build on a package with an unlimited allowance it lacks', () => {
    const { base } = highlightsOf(
      pkg('pro', { dish_limit: 500 }),
      pkg('custom', { dish_limit: null }),
    )

    expect(base).toBeNull()
  })
})
