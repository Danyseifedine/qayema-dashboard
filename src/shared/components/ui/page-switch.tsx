import { Segmented } from '@/shared/components/ui/segmented'

export type PageSwitchProps<T extends string> = {
  /** What the pair is, for a screen reader: "Menu", "Orders". */
  label: string
  /** The page it sits on. */
  value: T
  options: { value: T; label: string }[]
  /** Opens another page; tapping the one it is on does nothing. */
  onOpen: (page: T) => void
}

/**
 * Two pages one phone tab holds, side by side at the top of each (Dishes and
 * Categories under Menu; Delivery and pickup and Table orders under Orders),
 * so neither needs a trip through More. A wider screen has both in the
 * sidebar and does without it.
 */
export function PageSwitch<T extends string>({ label, value, options, onOpen }: PageSwitchProps<T>) {
  return (
    <div className="lg:hidden">
      <Segmented
        block
        aria-label={label}
        value={value}
        onChange={(page) => page !== value && onOpen(page)}
        options={options}
      />
    </div>
  )
}
