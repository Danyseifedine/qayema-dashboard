import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** A stand-in for the browser's audio element: it records what it was asked. */
class FakeAudio {
  static made: FakeAudio[] = []
  static refuse = false

  currentTime = 4.2
  play = vi.fn(() =>
    FakeAudio.refuse
      ? Promise.reject(new DOMException('The owner has not clicked yet.', 'NotAllowedError'))
      : Promise.resolve(),
  )

  readonly src: string

  constructor(src: string) {
    this.src = src
    FakeAudio.made.push(this)
  }
}

/** The module keeps one element; a fresh copy per test starts without one. */
async function freshSound() {
  vi.resetModules()
  return import('@/features/orders/utils/new-order-sound')
}

describe('playNewOrderSound', () => {
  beforeEach(() => {
    FakeAudio.made = []
    FakeAudio.refuse = false
    vi.stubGlobal('Audio', FakeAudio)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('plays the chime from public/ from its start', async () => {
    const { playNewOrderSound } = await freshSound()

    playNewOrderSound()

    expect(FakeAudio.made).toHaveLength(1)
    const sound = FakeAudio.made[0]!
    expect(sound.src).toBe(`${import.meta.env.BASE_URL}new_order_alert.mp3`)
    expect(sound.currentTime).toBe(0)
    expect(sound.play).toHaveBeenCalledOnce()
  })

  it('rewinds the same chime for the next order instead of loading another', async () => {
    const { playNewOrderSound } = await freshSound()

    playNewOrderSound()
    FakeAudio.made[0]!.currentTime = 1.5
    playNewOrderSound()

    expect(FakeAudio.made).toHaveLength(1)
    expect(FakeAudio.made[0]!.currentTime).toBe(0)
    expect(FakeAudio.made[0]!.play).toHaveBeenCalledTimes(2)
  })

  it('stays silent, without an error, until the browser lets the page play sound', async () => {
    FakeAudio.refuse = true
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)
    const { playNewOrderSound } = await freshSound()

    expect(() => playNewOrderSound()).not.toThrow()
    const played = FakeAudio.made[0]!.play.mock.results[0]!.value as Promise<void>
    await expect(played).rejects.toThrow('The owner has not clicked yet.')
    // Let the swallowed refusal settle: nothing escapes as an unhandled error.
    await new Promise((resolve) => setTimeout(resolve, 0))

    process.off('unhandledRejection', unhandled)
    expect(unhandled).not.toHaveBeenCalled()
  })
})
