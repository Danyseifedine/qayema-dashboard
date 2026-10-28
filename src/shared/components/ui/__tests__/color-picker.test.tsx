import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ColorPicker } from '@/shared/components/ui/color-picker'

function Harness({ initial = '#FF0000', onChange }: { initial?: string; onChange?: () => void }) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <ColorPicker
        value={value}
        onChange={(next) => {
          setValue(next)
          onChange?.()
        }}
        label="Dots"
        className="size-10"
      />
      <output data-testid="value">{value}</output>
      <button type="button">elsewhere</button>
    </>
  )
}

const swatch = () => screen.getByRole('button', { name: 'Dots, picker' })
const shade = () => screen.getByRole('slider', { name: 'Shade' })
const hue = () => screen.getByRole('slider', { name: 'Hue' })
const stored = () => screen.getByTestId('value').textContent

/** Every box measures 200 by 100 at the window's top left. */
function measure() {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    top: 0,
    left: 0,
    bottom: 100,
    right: 200,
    width: 200,
    height: 100,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })
}

describe('ColorPicker', () => {
  it('opens on the colour it holds and closes on a second press', async () => {
    const user = userEvent.setup()
    render(<Harness initial="#C8A24A" />)

    expect(swatch()).toHaveAttribute('aria-expanded', 'false')
    expect((swatch().firstElementChild as HTMLElement).style.backgroundColor).toBe(
      'rgb(200, 162, 74)',
    )
    await user.click(swatch())

    expect(screen.getByRole('dialog', { name: 'Dots, picker' })).toBeInTheDocument()
    expect(swatch()).toHaveAttribute('aria-expanded', 'true')
    expect(hue()).toHaveAttribute('aria-valuenow', '42')
    expect(hue()).toHaveAttribute('aria-valuemax', '360')
    expect(shade()).toHaveAttribute('aria-valuenow', '63')
    expect(shade()).toHaveAttribute('aria-valuetext', 'Saturation 63%, brightness 78%')

    await user.click(swatch())
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('moves the shade and the hue with the keyboard', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(swatch())

    // Red at full brightness: down darkens, left greys.
    shade().focus()
    await user.keyboard('{Shift>}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{/Shift}')
    expect(stored()).toBe('#800000')
    await user.keyboard('{ArrowUp}{ArrowLeft}{ArrowRight}')
    expect(shade()).toHaveAttribute('aria-valuetext', 'Saturation 100%, brightness 51%')
    await user.keyboard('{Shift>}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{/Shift}')
    expect(shade()).toHaveAttribute('aria-valuenow', '0')
    // Other keys leave it alone.
    await user.keyboard('a')
    expect(shade()).toHaveAttribute('aria-valuenow', '0')

    // A grey keeps the hue it came from.
    await user.keyboard('{Shift>}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{/Shift}')
    expect(stored()).toBe('#820000')

    hue().focus()
    await user.keyboard('{End}')
    expect(hue()).toHaveAttribute('aria-valuenow', '360')
    await user.keyboard('{ArrowUp}')
    expect(hue()).toHaveAttribute('aria-valuenow', '360')
    await user.keyboard('{Home}{ArrowDown}')
    expect(hue()).toHaveAttribute('aria-valuenow', '0')
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowLeft}{Shift>}{ArrowUp}{/Shift}')
    expect(hue()).toHaveAttribute('aria-valuenow', '11')
    await user.keyboard('a')
    expect(hue()).toHaveAttribute('aria-valuenow', '11')
  })

  it('follows a press and a drag until it is let go', async () => {
    measure()
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(swatch())

    // The middle of the hue strip is cyan.
    fireEvent.pointerDown(hue(), { clientX: 100, clientY: 5, pointerId: 1 })
    expect(stored()).toBe('#00FFFF')
    // Dragged past its end, it stops at the end.
    fireEvent.pointerMove(hue(), { clientX: 400, clientY: 5 })
    expect(hue()).toHaveAttribute('aria-valuenow', '360')
    fireEvent.pointerUp(hue())
    fireEvent.pointerMove(hue(), { clientX: 0, clientY: 5 })
    expect(hue()).toHaveAttribute('aria-valuenow', '360')

    // The shade box: half across, a quarter down.
    const capture = vi.fn()
    shade().setPointerCapture = capture
    fireEvent.pointerDown(shade(), { clientX: 100, clientY: 25, pointerId: 7 })
    expect(capture).toHaveBeenCalledWith(7)
    expect(shade()).toHaveAttribute('aria-valuetext', 'Saturation 50%, brightness 75%')
    fireEvent.pointerMove(shade(), { clientX: -50, clientY: 200 })
    expect(stored()).toBe('#000000')
  })

  it('reads a box with no size as one wide', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(swatch())

    fireEvent.pointerDown(hue(), { clientX: 0, clientY: 0, pointerId: 1 })
    expect(hue()).toHaveAttribute('aria-valuenow', '0')
  })

  it('closes on Escape, back on the swatch, without closing a dialog around it', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)

    // Closed, Escape is the dialog's.
    expect(fireEvent.keyDown(swatch(), { key: 'Escape' })).toBe(true)
    await user.click(swatch())
    expect(fireEvent.keyDown(hue(), { key: 'Escape' })).toBe(false)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(swatch()).toHaveFocus()

    await user.click(swatch())
    await user.click(screen.getByRole('button', { name: 'elsewhere' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
  })
})
