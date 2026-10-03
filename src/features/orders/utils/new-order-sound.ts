/** public/new_order_alert.mp3, wherever the dashboard is served from. */
const SOUND_URL = `${import.meta.env.BASE_URL}new_order_alert.mp3`

let sound: HTMLAudioElement | null = null

/**
 * The chime for a new order. A browser only lets a page play sound once the
 * owner has clicked or typed in it, so until then this stays silent; the
 * toast and the tab title still say it.
 */
export function playNewOrderSound(): void {
  sound ??= new Audio(SOUND_URL)
  sound.currentTime = 0
  void sound.play().catch(() => undefined)
}
