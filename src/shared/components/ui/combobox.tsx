import { useCombobox } from 'downshift'
import { IconCheck, IconChevronDown } from '@tabler/icons-react'
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/utils/dom/cn'
import { controlClass } from '@/shared/components/ui/control-class'
import { FieldShell, type FieldTone } from '@/shared/components/ui/field-shell'

export type ComboboxOption = {
  value: string
  label: string
  /** Muted text on the trailing side: a dial code, a currency name. */
  description?: string
  /** Leading adornment, e.g. a flag. */
  leading?: ReactNode
  disabled?: boolean
}

export type ComboboxProps = {
  options: ComboboxOption[]
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  /** Type to filter. Off gives a plain listbox with typeahead. */
  searchable?: boolean
  emptyText?: string
  disabled?: boolean
  tone?: FieldTone
  /** `sm`: a shorter box, for several small pickers on one line (a time). */
  size?: 'md' | 'sm'
  /**
   * Render without a `FieldShell` of its own, for a control that already
   * sits inside one. The parent must be positioned.
   */
  embedded?: boolean
  id?: string
  name?: string
  'aria-label'?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
  onBlur?: () => void
  inputRef?: Ref<HTMLInputElement>
  className?: string
}

/** Roughly the panel height plus its offset, used to decide which way to open. */
const PANEL_SPACE = 292
/** The widest the panel grows to fit its options (a time and its part of the day). */
const PANEL_WIDTH = 320

/**
 * A searchable select.
 *
 * The list is rendered inline rather than in a portal, because every modal in
 * this app is a native `<dialog>` living in the browser's top layer: anything
 * appended to `<body>` would be painted behind it. While open it is `fixed`
 * at the field's place on screen (followed on scroll and resize), so a
 * scrolling parent, such as a dialog's body, cannot clip it. Keyboard
 * behaviour comes from downshift, which supplies the ARIA combobox contract.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder,
  searchable = true,
  emptyText,
  disabled = false,
  tone = 'default',
  embedded = false,
  size = 'md',
  id,
  name,
  onBlur,
  inputRef,
  className,
  ...aria
}: ComboboxProps) {
  const { t } = useTranslation()
  const shellRef = useRef<HTMLDivElement>(null)
  // Where the open list sits on screen, measured from the field.
  const [place, setPlace] = useState<CSSProperties>({})
  // `null` means "not filtering": the input mirrors the selected label.
  // Any string, including an empty one, is an active filter, which is what
  // lets the owner clear the field and search from scratch.
  const [query, setQuery] = useState<string | null>(null)

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  )

  const filtered = useMemo(() => {
    if (!searchable || query === null) return options
    const needle = query.trim().toLowerCase()
    if (needle === '') return options
    return options.filter((option) =>
      [option.label, option.description ?? '', option.value].some((field) =>
        field.toLowerCase().includes(needle),
      ),
    )
  }, [options, query, searchable])

  const {
    isOpen,
    getToggleButtonProps,
    getMenuProps,
    getInputProps,
    getItemProps,
    highlightedIndex,
    setHighlightedIndex,
    openMenu,
  } = useCombobox({
    items: filtered,
    isItemDisabled: (option) => option.disabled === true,
    // Highlight the top match so Enter picks it straight after typing;
    // without this, filtering leaves nothing highlighted and Enter is a no-op.
    defaultHighlightedIndex: 0,
    itemToString: (option) => option?.label ?? '',
    selectedItem: selected,
    inputValue: query ?? selected?.label ?? '',
    onInputValueChange: ({ inputValue, type }) => {
      // Only a real keystroke changes the filter; downshift also emits this
      // on select and on blur, which must not re-filter the list.
      if (type === useCombobox.stateChangeTypes.InputChange) setQuery(inputValue ?? '')
    },
    onSelectedItemChange: ({ selectedItem }) => {
      onChange(selectedItem?.value ?? null)
      setQuery(null)
    },
    onIsOpenChange: ({ isOpen: open, type }) => {
      if (!open) return
      setPlace(placeFor(shellRef.current, embedded))
      // Opened without typing: on the current choice, so a time sits where
      // it is in the day rather than the list starting at midnight.
      if (selected && type !== useCombobox.stateChangeTypes.InputChange) {
        setHighlightedIndex(options.indexOf(selected))
      }
      // Opening a searchable list empties the box so the owner types a filter
      // rather than editing the selected label. Guarded on `null` so the
      // keystroke that opens the menu is not wiped by the same state change.
      if (searchable && query === null) setQuery('')
    },
  })

  // The field moves under a fixed list when its dialog or page scrolls, or
  // the window changes size: the list follows it while open.
  useLayoutEffect(() => {
    if (!isOpen) return
    const follow = () => setPlace(placeFor(shellRef.current, embedded))
    window.addEventListener('scroll', follow, true)
    window.addEventListener('resize', follow)
    return () => {
      window.removeEventListener('scroll', follow, true)
      window.removeEventListener('resize', follow)
    }
  }, [isOpen, embedded])

  // Typeahead for the non-searchable variant: the input is read-only, so the
  // usual filtering is unavailable and letters jump the highlight instead.
  const buffer = useRef({ text: '', at: 0 })

  const inputProps = getInputProps({
    ref: inputRef,
    id,
    name,
    placeholder,
    disabled,
    readOnly: !searchable,
    onBlur: () => {
      // Leaving the field ends the filter and restores the chosen label.
      // Closing the menu does not, because clicking the input toggles it shut
      // while the owner is still typing.
      setQuery(null)
      onBlur?.()
    },
    ...aria,
    onKeyDown: (event) => {
      // Escape must close the list without also closing the dialog that may
      // contain it, so the native cancel is swallowed while the list is open.
      if (event.key === 'Escape' && isOpen) event.preventDefault()

      if (searchable || event.key.length !== 1 || event.metaKey || event.ctrlKey) return

      const now = Date.now()
      buffer.current = {
        text: now - buffer.current.at > 500 ? event.key : buffer.current.text + event.key,
        at: now,
      }
      const needle = buffer.current.text.toLowerCase()
      const index = filtered.findIndex((option) => option.label.toLowerCase().startsWith(needle))
      if (index >= 0) {
        if (!isOpen) openMenu()
        setHighlightedIndex(index)
      }
    },
  })

  const list = (
    <ul
      {...getMenuProps()}
      hidden={!isOpen}
      // At least as wide as the field, wider to fit its options; near the
      // screen's edge it grows the other way so it never runs off it.
      style={place}
      className={cn(
        'fixed z-50 flex max-h-[280px] flex-col gap-0.5 overflow-y-auto',
        'rounded-[12px] border-[0.5px] border-[var(--line)] bg-[var(--surface)] p-1.5 shadow-pop',
        embedded
          ? 'w-[min(320px,calc(100vw-32px))]'
          : 'w-max max-w-[min(320px,calc(100vw-32px))]',
      )}
    >
      {isOpen && filtered.length === 0 ? (
        <li className="px-3 py-5 text-center text-[13px] text-[var(--muted)]">{emptyText ?? t('combobox.noMatches')}</li>
      ) : null}

      {isOpen
        ? filtered.map((option, index) => {
            const active = option.value === value
            return (
              <li
                key={option.value}
                {...getItemProps({ item: option, index })}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-[8px] px-3 py-2.5 text-[14px]',
                  'text-[var(--text)] transition-colors',
                  highlightedIndex === index && 'bg-[var(--hover-wash)]',
                  active && 'bg-accent-wash text-accent',
                  option.disabled && 'cursor-not-allowed opacity-50',
                )}
              >
                {option.leading ? <span className="shrink-0">{option.leading}</span> : null}
                <span className="truncate">{option.label}</span>
                {option.description ? (
                  <span className="ms-auto truncate text-[12px] text-[var(--muted)]">
                    {option.description}
                  </span>
                ) : null}
                {active ? (
                  <IconCheck
                    aria-hidden
                    className={cn('size-3.5 shrink-0', option.description ? 'ms-1' : 'ms-auto')}
                  />
                ) : null}
              </li>
            )
          })
        : null}
    </ul>
  )

  const inner = (
    <>
      {selected?.leading ? (
        <span className="ms-3.5 shrink-0" aria-hidden>
          {selected.leading}
        </span>
      ) : null}
      <input
        // An input with no `type` is not a labellable element, so the field's
        // <label for> would not bind to it.
        type="text"
        {...inputProps}
        className={cn(
          controlClass,
          size === 'sm' ? 'py-2 ps-2.5 pe-7 text-[14px]' : 'pe-10',
          selected?.leading && 'ps-2',
          searchable ? 'cursor-text' : 'cursor-pointer',
        )}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        disabled={disabled}
        {...getToggleButtonProps()}
        className={cn(
          'absolute top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md',
          // In a small box the arrow covers much of it; clicks pass to the
          // field, which opens the list just the same.
          size === 'sm' ? 'pointer-events-none end-0.5' : 'end-2.5',
          'text-[var(--muted)] transition-transform',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
          isOpen && 'rotate-180',
        )}
      >
        <IconChevronDown aria-hidden className="size-3.5" />
      </button>
    </>
  )

  if (embedded) {
    return (
      <div ref={shellRef} className={cn('relative flex items-center', className)}>
        {inner}
        {list}
      </div>
    )
  }

  return (
    <div ref={shellRef} className={cn('relative', className)}>
      <FieldShell tone={tone} disabled={disabled}>
        {inner}
      </FieldShell>
      {list}
    </div>
  )
}

/** The gap between the field and its list. */
const GAP = 6

/**
 * Where the open list goes on screen: under the field (over it when there is
 * not enough room below but more above), from the field's start edge (from
 * its end edge near the screen's side), and at least as wide as the field.
 */
function placeFor(element: HTMLElement | null, embedded: boolean): CSSProperties {
  if (!element || typeof window === 'undefined') return {}
  const rect = element.getBoundingClientRect()
  const rtl = getComputedStyle(element).direction === 'rtl'
  const fromEnd = !embedded && shouldAlignEnd(element)
  // In Arabic the start edge is the right one.
  const fromLeft = rtl ? fromEnd : !fromEnd

  return {
    ...(shouldFlipUp(element)
      ? { bottom: window.innerHeight - rect.top + GAP }
      : { top: rect.bottom + GAP }),
    ...(fromLeft ? { left: rect.left } : { right: window.innerWidth - rect.right }),
    ...(embedded ? {} : { minWidth: rect.width }),
  }
}

/** Grow toward the start edge when there is not enough room toward the end. */
function shouldAlignEnd(element: HTMLElement | null): boolean {
  if (!element || typeof window === 'undefined') return false
  const rect = element.getBoundingClientRect()
  const rtl = getComputedStyle(element).direction === 'rtl'
  const towardEnd = rtl ? rect.right : window.innerWidth - rect.left
  return towardEnd < Math.min(PANEL_WIDTH, window.innerWidth - 32)
}

/** Open upward when there is not enough room below but more above. */
function shouldFlipUp(element: HTMLElement | null): boolean {
  if (!element || typeof window === 'undefined') return false
  const rect = element.getBoundingClientRect()
  const below = window.innerHeight - rect.bottom
  return below < PANEL_SPACE && rect.top > below
}
