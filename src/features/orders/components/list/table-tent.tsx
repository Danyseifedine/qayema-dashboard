import { useId } from 'react'
import { cn } from '@/shared/utils/dom/cn'
import { QR_GROUND } from '@/shared/constants/pictures'

/** The dark marble table the QR page's code stands on. */

/**
 * What a table's tent card shows: the number in its name ("Table 12" → 12),
 * else its first letter.
 */
function tentLabel(name: string): string {
  return name.match(/\d+/g)?.at(-1) ?? name.trim().charAt(0).toUpperCase()
}

/**
 * A wooden tent card standing on a table, with the table's number on it: the
 * picture a table order is recognised by at a glance.
 */
export function TableTent({ name, className }: { name: string; className?: string }) {
  const id = useId()
  const label = tentLabel(name)

  return (
    <div aria-hidden className={cn('relative isolate overflow-hidden rounded-tile', className)}>
      <img
        src={QR_GROUND}
        alt=""
        decoding="async"
        loading="lazy"
        className="absolute inset-0 -z-10 size-full object-cover"
      />
      <svg viewBox="10 14 86 92" className="size-full">
        <defs>
          <linearGradient id={`${id}-wood`} x1="0" y1="0" x2="0.2" y2="1">
            <stop offset="0" stopColor="#c08c56" />
            <stop offset="1" stopColor="#7a4f27" />
          </linearGradient>
        </defs>
        <ellipse cx="54" cy="99" rx="36" ry="4.5" fill="#000" opacity="0.5" />
        <polygon points="68,24 82,36 86,90 74,94" fill="#4a2e15" />
        <polygon points="26,30 68,24 74,94 22,98" fill={`url(#${id}-wood)`} />
        <line x1="26" y1="30" x2="68" y2="24" stroke="rgba(255,230,190,0.55)" strokeWidth="0.9" />
        <text
          x="48"
          y="74"
          textAnchor="middle"
          fill="#2a1708"
          fontSize={label.length > 2 ? 24 : 38}
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {label}
        </text>
      </svg>
    </div>
  )
}
