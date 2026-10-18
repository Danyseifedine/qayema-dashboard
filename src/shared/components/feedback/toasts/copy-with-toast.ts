import { toast } from '@/shared/components/feedback/toasts/toast'

/**
 * Copies text to the clipboard and says whether it worked. A browser can
 * refuse (no permission, an insecure page), which is a message, not a crash.
 */
export async function copyWithToast(
  text: string,
  messages: { copied: string; failed: string },
): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(messages.copied)
  } catch {
    toast.error(messages.failed)
  }
}
