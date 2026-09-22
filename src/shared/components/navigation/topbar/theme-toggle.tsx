import { Moon, Sun } from 'lucide-react'
import { usePreferencesStore } from '@/stores/preferences.store'
import { cn } from '@/shared/utils/dom/cn'

/**
 * The portal's `.theme-tog`: a 58x32 track with a 24px gold knob that slides
 * from one end to the other. The knob moves on a logical inset, so it travels
 * the right way in Arabic.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = usePreferencesStore((state) => state.theme)
  const toggleTheme = usePreferencesStore((state) => state.toggleTheme)
  const dark = theme === 'dark'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={toggleTheme}
      className={cn(
        'relative h-8 w-[58px] shrink-0 rounded-full border border-[var(--line)] bg-[var(--surface)]',
        'transition-colors duration-200',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-on)]',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-accent-fill text-ink',
          'transition-[inset-inline-start] duration-400 [transition-timing-function:var(--ease-qayema)]',
          dark ? 'start-[29px]' : 'start-[3px]',
        )}
      >
        {dark ? <Moon className="size-[13px]" /> : <Sun className="size-[13px]" />}
      </span>
    </button>
  )
}
