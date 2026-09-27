import type { CSSProperties } from 'react'

/**
 * Shared look for the analytics charts. Colours are the theme's tokens, so a
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
