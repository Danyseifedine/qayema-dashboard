import { useTranslation } from 'react-i18next'
import { NAV_ITEMS } from '@/app/layouts/authenticated/nav-items'
import type { TopbarHero } from '@/app/layouts/authenticated/topbar/topbar'

/**
 * The heading over a page. Home greets the owner by name; every other page
 * gives its name twice, small and large, and the line its page has always
 * opened with.
 */
export function usePageHero(key: string, ownerName: string): TopbarHero {
  const { t } = useTranslation()

  if (key === 'overview') {
    return {
      eyebrow: t(`greeting.${partOfDay(new Date().getHours())}`),
      title: ownerName,
      subtitle: t('greeting.subtitle'),
    }
  }
  if (key === 'more') {
    return { eyebrow: t('nav.more'), title: t('nav.more'), subtitle: t('more.subtitle') }
  }

  const item = NAV_ITEMS.find((candidate) => candidate.key === key)
  const name = item ? t(item.labelKey) : t('app.dashboard')
  return { eyebrow: name, title: name, subtitle: subtitleOf(key) }

  function subtitleOf(page: string): string {
    switch (page) {
      case 'analytics':
        return t('description', { ns: 'analytics' })
      case 'orders':
        return t('page.description', { ns: 'orders' })
      case 'table-orders':
        return t('tables.description', { ns: 'orders' })
      case 'categories':
        return t('categoriesPage.description', { ns: 'menu' })
      case 'dishes':
        return t('dishesPage.description', { ns: 'menu' })
      case 'appearance':
        return t('page.description', { ns: 'appearance' })
      case 'qr':
        return t('page.description', { ns: 'qr' })
      case 'tables':
        return t('page.description', { ns: 'tables' })
      case 'restaurant':
        return t('page.description', { ns: 'restaurant' })
      case 'features':
        return t('description', { ns: 'features' })
      case 'package':
        return t('page.description', { ns: 'package' })
      case 'account':
        return t('page.description', { ns: 'account' })
      case 'social-links':
        return t('page.limitDescription', { ns: 'social-links' })
      // Its line changes with what is on the page, so the heading uses the
      // hint from its More card.
      case 'design':
        return t('more.hints.design')
      default:
        return ''
    }
  }
}

/** The part of the day on the owner's own clock, for Home's greeting. */
function partOfDay(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  return 'evening'
}
