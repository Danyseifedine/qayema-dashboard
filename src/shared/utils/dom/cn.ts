import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge conditional class names, letting later Tailwind utilities win over
 * earlier ones. Every component takes a `className` prop and funnels it
 * through here, so callers can always override a default.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
