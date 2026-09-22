import { useCombobox } from 'downshift'
import { Check, ChevronDown } from 'lucide-react'
import { useMemo, useRef, useState, type ReactNode, type Ref } from 'react'
import { cn } from '@/shared/utils/dom/cn'
import { controlClass } from './control-class'
import { FieldShell, type FieldTone } from './field-shell'

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

/**
 * A searchable select.
 *
 * The list is rendered inline rather than in a portal, because every modal in
 * this app is a native `<dialog>` living in the browser's top layer: anything
 * appended to `<body>` would be painted behind it. Keyboard behaviour comes
 * from downshift, which supplies the ARIA combobox contract.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder,
  searchable = true,
  emptyText = 'No matches',
  disabled = false,
  tone = 'default',
  embedded = false,
  id,
  name,
  onBlur,
  inputRef,
  className,
  ...aria
}: ComboboxProps) {
  const shellRef = useRef<HTMLDivElement>(null)
  const [flipUp, setFlipUp] = useState(false)
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
    onIsOpenChange: ({ isOpen: open }) => {
      if (!open) return
      setFlipUp(shouldFlipUp(shellRef.current))
      // Opening a searchable list empties the box so the owner types a filter
      // rather than editing the selected label. Guarded on `null` so the
      // keystroke that opens the menu is not wiped by the same state change.
      if (searchable && query === null) setQuery('')
    },
  })

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
      className={cn(
        'absolute z-50 flex max-h-[280px] flex-col gap-0.5 overflow-y-auto',
        'rounded-[12px] border-[0.5px] border-[var(--line)] bg-[var(--surface)] p-1.5 shadow-pop',
        embedded ? 'start-0 w-[min(320px,calc(100vw-32px))]' : 'inset-x-0',
        flipUp ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]',
      )}
    >
      {isOpen && filtered.length === 0 ? (
        <li className="px-3 py-5 text-center text-[13px] text-[var(--muted)]">{emptyText}</li>
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
                  <Check
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
          'pe-10',
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
          'absolute end-2.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md',
          'text-[var(--muted)] transition-transform',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
          isOpen && 'rotate-180',
        )}
      >
        <ChevronDown aria-hidden className="size-3.5" />
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

/** Open upward when there is not enough room below but more above. */
function shouldFlipUp(element: HTMLElement | null): boolean {
  if (!element || typeof window === 'undefined') return false
  const rect = element.getBoundingClientRect()
  const below = window.innerHeight - rect.bottom
  return below < PANEL_SPACE && rect.top > below
}
