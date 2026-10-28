import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { menuPanelClass } from '@/shared/components/ui/control-class'
import { floatingRoot, useAnchoredPlace } from '@/shared/hooks/use-anchored-place'
import { useDismiss } from '@/shared/hooks/use-dismiss'
import { hexToHsv, hsvToHex, type Hsv } from '@/shared/utils/color/hsv'
import { cn } from '@/shared/utils/dom/cn'

export type ColorPickerProps = {
  /** "#RRGGBB". */
  value: string
  /** Each colour as the owner moves through them, "#RRGGBB" in capitals. */
  onChange: (value: string) => void
  /** What the colour is for: names the swatch and its panel. */
  label: string
  /** The swatch's size and corners. */
  className?: string
}

/** The panel's width, and roughly its height with its offset. */
const PANEL_WIDTH = 248
const PANEL_SPACE = 236

const clamp = (value: number) => Math.min(1, Math.max(0, value))

/** Where a pointer is across a box, 0 to 1 each way. */
function pointIn(event: PointerEvent<HTMLElement>): { x: number; y: number } {
  const rect = event.currentTarget.getBoundingClientRect()
  return {
    x: clamp((event.clientX - rect.left) / (rect.width || 1)),
    y: clamp((event.clientY - rect.top) / (rect.height || 1)),
  }
}

/** A step for an arrow key: ten times bigger with Shift. */
function stepOf(event: KeyboardEvent, small: number): number {
  return event.shiftKey ? small * 10 : small
}

/**
 * Follows a press and drag on a box, so the colour moves with the finger or
 * the mouse until it is let go, even off the box.
 */
function useDrag(onPoint: (point: { x: number; y: number }) => void) {
  const dragging = useRef(false)
  return {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      dragging.current = true
      event.currentTarget.setPointerCapture?.(event.pointerId)
      onPoint(pointIn(event))
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      if (dragging.current) onPoint(pointIn(event))
    },
    onPointerUp: () => {
      dragging.current = false
    },
  }
}

/** The round handle on the shade box and the hue strip. */
function Thumb({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4),0_2px_6px_rgba(0,0,0,0.5)]"
      style={{ left: `${x * 100}%`, top: `${y * 100}%`, backgroundColor: color }}
    />
  )
}

/**
 * A colour swatch that opens our own picker under it, rather than the
 * browser's (a different window on every phone and system): a box of
 * shades (saturation across, brightness up) over a strip of hues, each
 * dragged with a finger or the mouse or moved with the arrow keys (Shift
 * for bigger steps). The colour changes as it moves, like the system
 * picker did; Escape or a press outside closes it.
 */
export function ColorPicker({ value, onChange, label, className }: ColorPickerProps) {
  const { t } = useTranslation()
  const container = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  // Kept apart from the hex so a grey keeps the hue it was dragged from.
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value))
  const place = useAnchoredPlace(open, container, {
    width: PANEL_WIDTH,
    height: PANEL_SPACE,
    alignEnd: true,
    matchWidth: false,
  })

  const close = useCallback(() => setOpen(false), [])
  useDismiss({ open, onDismiss: close, container, trigger, panel })

  const set = (next: Hsv) => {
    setHsv(next)
    onChange(hsvToHex(next))
  }

  const shadeDrag = useDrag(({ x, y }) => set({ ...hsv, s: x, v: 1 - y }))
  const hueDrag = useDrag(({ x }) => set({ ...hsv, h: x * 360 }))

  const onShadeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = stepOf(event, 0.01)
    const moves: Record<string, Partial<Hsv>> = {
      ArrowRight: { s: clamp(hsv.s + step) },
      ArrowLeft: { s: clamp(hsv.s - step) },
      ArrowUp: { v: clamp(hsv.v + step) },
      ArrowDown: { v: clamp(hsv.v - step) },
    }
    const move = moves[event.key]
    if (!move) return
    event.preventDefault()
    set({ ...hsv, ...move })
  }

  const onHueKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = stepOf(event, 1)
    const hues: Record<string, number> = {
      ArrowRight: hsv.h + step,
      ArrowUp: hsv.h + step,
      ArrowLeft: hsv.h - step,
      ArrowDown: hsv.h - step,
      Home: 0,
      End: 360,
    }
    const hue = hues[event.key]
    if (hue === undefined) return
    event.preventDefault()
    set({ ...hsv, h: Math.min(360, Math.max(0, hue)) })
  }

  const saturation = Math.round(hsv.s * 100)
  const brightness = Math.round(hsv.v * 100)
  const pure = `hsl(${hsv.h} 100% 50%)`
  const name = t('colorField.picker', { label })

  const slider = (props: {
    label: string
    now: number
    max: number
    text?: string
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
    className: string
    style: CSSProperties
    drag: ReturnType<typeof useDrag>
    children: ReactNode
  }) => (
    <div
      role="slider"
      tabIndex={0}
      aria-label={props.label}
      aria-valuemin={0}
      aria-valuemax={props.max}
      aria-valuenow={props.now}
      aria-valuetext={props.text}
      onKeyDown={props.onKeyDown}
      {...props.drag}
      className={cn('focus-ring relative cursor-pointer touch-none', props.className)}
      style={props.style}
    >
      {props.children}
    </div>
  )

  return (
    <div
      ref={container}
      className="relative shrink-0"
      onKeyDown={(event) => {
        // Escape closes the picker (useDismiss), not the dialog it sits in.
        if (event.key === 'Escape' && open) event.preventDefault()
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-label={name}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (!open) setHsv(hexToHsv(value))
          setOpen(!open)
        }}
        className={cn(
          'focus-ring block cursor-pointer border-[0.5px] border-[var(--line)] p-1',
          className,
        )}
      >
        <span
          aria-hidden
          className="block size-full rounded-[inherit] shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.12)]"
          style={{ backgroundColor: value }}
        />
      </button>

      {open
        ? createPortal(
        <div
          ref={panel}
          role="dialog"
          aria-label={name}
          // The boxes read left to right in Arabic too, like any colour picker.
          dir="ltr"
          style={place}
          className={cn(
            'fixed z-50 flex w-[min(248px,calc(100vw-32px))] flex-col gap-3 p-3',
            menuPanelClass,
          )}
        >
          {slider({
            label: t('colorField.shade'),
            now: saturation,
            max: 100,
            text: t('colorField.shadeValue', { saturation, brightness }),
            onKeyDown: onShadeKeyDown,
            drag: shadeDrag,
            className: 'h-36 rounded-tile',
            style: {
              background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), ${pure}`,
            },
            children: <Thumb x={hsv.s} y={1 - hsv.v} color={value} />,
          })}
          {slider({
            label: t('colorField.hue'),
            now: Math.round(hsv.h),
            max: 360,
            onKeyDown: onHueKeyDown,
            drag: hueDrag,
            className: 'h-3 rounded-full',
            style: {
              background:
                'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
            },
            children: <Thumb x={hsv.h / 360} y={0.5} color={pure} />,
          })}
        </div>,
            floatingRoot(container.current),
          )
        : null}
    </div>
  )
}
