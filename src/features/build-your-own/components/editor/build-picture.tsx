import { cn } from '@/shared/utils/dom/cn'
import type { BuildShape } from '@/features/build-your-own/utils/build-price'

const SIZE = 64
const MIDDLE = SIZE / 2
const RADIUS = 29

/** A point on the pie's rim, `turn` of the way round from the top. */
function rim(turn: number): string {
  const angle = turn * 2 * Math.PI - Math.PI / 2
  return `${(MIDDLE + RADIUS * Math.cos(angle)).toFixed(2)} ${(MIDDLE + RADIUS * Math.sin(angle)).toFixed(2)}`
}

/**
 * A build drawn as the guest gets it: a pie cut into `count` parts for a
 * split build (as the menu draws a pizza), `count` round pieces side by side
 * otherwise. The parts take turns in two golds, so each reads apart.
 */
export function BuildPicture({
  shape,
  count,
  className,
}: {
  shape: BuildShape
  count: number
  className?: string
}) {
  const tone = (index: number) => (index % 2 === 0 ? 'fill-gold' : 'fill-gold/55')

  if (shape === 'pieces') {
    const step = 26
    return (
      <svg
        aria-hidden
        viewBox={`0 0 ${count * step + 4} 30`}
        className={cn('h-10 w-auto', className)}
      >
        {Array.from({ length: count }, (_, index) => (
          <circle
            key={index}
            cx={index * step + 15}
            cy={15}
            r={12}
            className={cn(tone(index), 'stroke-[var(--bg)] stroke-2')}
          />
        ))}
      </svg>
    )
  }

  return (
    <svg aria-hidden viewBox={`0 0 ${SIZE} ${SIZE}`} className={cn('size-16', className)}>
      {count <= 1 ? (
        <circle cx={MIDDLE} cy={MIDDLE} r={RADIUS} className={tone(0)} />
      ) : (
        Array.from({ length: count }, (_, index) => (
          <path
            key={index}
            d={`M${MIDDLE} ${MIDDLE}L${rim(index / count)}A${RADIUS} ${RADIUS} 0 0 1 ${rim((index + 1) / count)}Z`}
            className={cn(tone(index), 'stroke-[var(--bg)] stroke-[1.5]')}
          />
        ))
      )}
    </svg>
  )
}
