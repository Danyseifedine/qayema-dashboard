import { IconMinus, IconPlus } from '@tabler/icons-react'
import { Button } from '@/shared/components/ui'

export type QuantityStepperProps = {
  value: number
  onChange: (value: number) => void
  /** 0 lets a line come off; 1 keeps it on. */
  min?: number
  max?: number
  /** What is being counted, for screen readers. */
  label: string
}

/** Minus, the number, plus: how many of a dish. */
export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = 99,
  label,
}: QuantityStepperProps) {
  return (
    <div role="group" aria-label={label} className="inline-flex items-center gap-1">
      <Button
        variant="secondary"
        size="icon"
        className="size-8"
        aria-label={`${label} -1`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <IconMinus aria-hidden className="size-3.5" />
      </Button>
      <span className="min-w-6 text-center text-[14px] font-medium tabular-nums" aria-live="polite">
        {value}
      </span>
      <Button
        variant="secondary"
        size="icon"
        className="size-8"
        aria-label={`${label} +1`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <IconPlus aria-hidden className="size-3.5" />
      </Button>
    </div>
  )
}
