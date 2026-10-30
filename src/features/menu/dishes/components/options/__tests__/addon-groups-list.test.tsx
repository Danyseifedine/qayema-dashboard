import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/render-with-providers'
import { AddonGroupsList } from '@/features/menu/dishes/components/options/addon-groups-list'
import {
  addonGroupLimits,
  addonGroupRule as ruleOf,
  type AddonGroup,
} from '@/features/menu/dishes/schemas/dish-choices.schema'

function group(min: number, max: number | null, count = 3): AddonGroup {
  return {
    id: 4,
    name: { en: 'Sauces', ar: 'صلصات' },
    min_select: min,
    max_select: max,
    addons: Array.from({ length: count }, (_, index) => ({
      id: 40 + index,
      name: { en: `Sauce ${index + 1}`, ar: null },
      price: index === 0 ? '0.00' : '0.50',
    })),
  }
}

describe('AddonGroupsList', () => {
  it('lists each group with its rule and its add-ons, free ones said so', () => {
    renderWithProviders(<AddonGroupsList groups={[group(0, 2)]} language="en" currency="USD" />)

    const card = screen.getByText('Sauces').closest('li')!
    expect(within(card).getByText('Pick up to 2')).toBeInTheDocument()
    expect(within(card).getByText('Sauce 1').closest('li')).toHaveTextContent('Free')
    expect(within(card).getByText('Sauce 2').closest('li')).toHaveTextContent('+$0.50')
    expect(screen.getByText('Add-on groups from your POS')).toBeInTheDocument()
  })

  it('names a group in the language asked, and draws nothing without groups', () => {
    const { container } = renderWithProviders(
      <AddonGroupsList groups={[]} language="en" currency="USD" />,
    )
    expect(container.querySelector('[data-addon-groups]')).toBeNull()

    renderWithProviders(<AddonGroupsList groups={[group(1, 1)]} language="ar" currency="USD" />)
    expect(screen.getByText('صلصات')).toBeInTheDocument()
  })

  it('falls back to a placeholder for a group with no name', () => {
    renderWithProviders(
      <AddonGroupsList
        groups={[{ ...group(0, null), name: { en: null, ar: null } }]}
        language="en"
        currency="USD"
      />,
    )
    expect(screen.getByText('Untitled group')).toBeInTheDocument()
  })
})

describe('a group rule', () => {
  it('says exactly, a range, up to, at least or any', () => {
    expect(ruleOf(group(2, 2))).toEqual(['choices.groups.exactly', { count: 2 }])
    expect(ruleOf(group(1, 2))).toEqual(['choices.groups.between', { min: 1, max: 2 }])
    expect(ruleOf(group(0, 2))).toEqual(['choices.groups.upTo', { max: 2 }])
    expect(ruleOf(group(1, null))).toEqual(['choices.groups.atLeast', { min: 1 }])
    expect(ruleOf(group(0, null))).toEqual(['choices.groups.any', {}])
  })

  it('never asks more than the group has, and drops a most that limits nothing', () => {
    expect(addonGroupLimits(group(5, 9))).toEqual({ min: 3, max: null })
    expect(addonGroupLimits(group(2, 1))).toEqual({ min: 2, max: 2 })
    expect(addonGroupLimits(group(-1, 0))).toEqual({ min: 0, max: 1 })
  })
})
