import type { CSSProperties } from 'react'
import type { Locale } from '@/shared/constants/locales'

/**
 * Shared look for the overview charts. Colours are the theme's tokens, so a
 * chart follows light and dark like everything else — SVG presentation
 * attributes resolve `var()` the same way CSS does.
 */
export const CHART_COLORS = {
  primary: 'var(--accent-text)',
  primarySoft: 'var(--accent-border)',
  secondary: 'var(--status-info)',
  grid: 'var(--line-2)',
  axis: 'var(--faint)',
} as const

export const TOOLTIP_STYLE: CSSProperties = {
  background: 'var(--surface)',
  border: '0.5px solid var(--line)',
  borderRadius: 10,
  boxShadow: 'var(--lift-shadow)',
  fontSize: 12,
  color: 'var(--text)',
}

export const AXIS_TICK = { fill: CHART_COLORS.axis, fontSize: 11 }

/** "2026-09-21" read as that calendar day, not midnight UTC. */
export function parseDay(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year!, month! - 1, day!)
}

export function formatDay(date: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(parseDay(date))
}

/** Monday first, in the reader's language. 2024-01-01 was a Monday. */
export function weekdayNames(locale: Locale, width: 'short' | 'long' = 'short'): string[] {
  const format = new Intl.DateTimeFormat(locale, { weekday: width })
  return Array.from({ length: 7 }, (_, index) => format.format(new Date(2024, 0, 1 + index)))
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}
