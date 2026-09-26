import type { ReactNode } from 'react'
import type { CornerStyle, DotStyle, EyeStyle } from '../../../schemas/qr.schema'

/**
 * Little pictures for the shape choices. Drawn by hand rather than by the QR
 * library: a picker needs a glance of the shape, not a scannable code, and
 * this keeps eleven extra drawings off the page.
 */

/** A few modules of a code, laid out the same way in every dot preview. */
const CELLS: [number, number][] = [
  [0, 0],
  [1, 0],
  [0, 1],
  [2, 1],
  [1, 2],
  [2, 2],
]

function dots(cell: (x: number, y: number) => ReactNode) {
  return (
    <svg viewBox="0 0 36 36" className="size-9" fill="currentColor">
      {CELLS.map(([col, row]) => (
        <g key={`${col}-${row}`}>{cell(3 + col * 10, 3 + row * 10)}</g>
      ))}
    </svg>
  )
}

/** A leaf: two opposite corners round, the other two square. */
function leaf(x: number, y: number, r: number) {
  return (
    <path
      d={`M${x + r},${y} H${x + 10} V${y + 10 - r} Q${x + 10},${y + 10} ${x + 10 - r},${y + 10} H${x} V${y + r} Q${x},${y} ${x + r},${y} Z`}
    />
  )
}

export const DOT_PREVIEWS: Record<DotStyle, ReactNode> = {
  square: dots((x, y) => <rect x={x} y={y} width={10} height={10} />),
  dots: dots((x, y) => <circle cx={x + 5} cy={y + 5} r={4.2} />),
  rounded: dots((x, y) => <rect x={x + 0.5} y={y + 0.5} width={9} height={9} rx={2.5} />),
  'extra-rounded': dots((x, y) => <rect x={x + 0.5} y={y + 0.5} width={9} height={9} rx={4.5} />),
  classy: dots((x, y) => leaf(x, y, 4)),
  'classy-rounded': dots((x, y) => leaf(x, y, 7)),
}

function frame(radius: number) {
  return (
    <svg viewBox="0 0 36 36" className="size-9" fill="none" stroke="currentColor" strokeWidth={5}>
      <rect x={5.5} y={5.5} width={25} height={25} rx={radius} />
    </svg>
  )
}

export const CORNER_PREVIEWS: Record<CornerStyle, ReactNode> = {
  square: frame(0),
  'extra-rounded': frame(8),
  dot: frame(12.5),
}

export const EYE_PREVIEWS: Record<EyeStyle, ReactNode> = {
  square: (
    <svg viewBox="0 0 36 36" className="size-9" fill="currentColor">
      <rect x={10} y={10} width={16} height={16} />
    </svg>
  ),
  dot: (
    <svg viewBox="0 0 36 36" className="size-9" fill="currentColor">
      <circle cx={18} cy={18} r={8.5} />
    </svg>
  ),
}
