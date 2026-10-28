import { KeyboardSensor, type KeyboardSensorProps } from '@dnd-kit/core'
import { getOwnerDocument } from '@dnd-kit/utilities'

/** The one part of dnd-kit's keyboard sensor it keeps private that this reaches. */
type Internals = { handleKeyDown: (event: Event) => void }

/**
 * dnd-kit's keyboard sensor, listening from the moment Space picks a card up.
 *
 * The stock sensor starts listening for the arrow keys on a timer, so the
 * Space that picked the card up is not read again as a drop. While the page
 * redraws for the lift, the browser runs a key pressed straight after before
 * that timer, and the key is lost: the card stays where it is. This listens at
 * once and skips that one Space instead. dnd-kit's own timer later adds the
 * same function, which the browser ignores, so no key is read twice; and its
 * clean-up on a drop removes it.
 */
export class EagerKeyboardSensor extends KeyboardSensor {
  constructor(props: KeyboardSensorProps) {
    // A drop before dnd-kit's timer leaves its listener added after the drag
    // ended; it must then do nothing, and takes itself off at the next key.
    let ended = false
    super({
      ...props,
      onEnd: () => {
        ended = true
        props.onEnd()
      },
      onCancel: () => {
        ended = true
        props.onCancel()
      },
    })

    const internals = this as unknown as Internals
    const handleKeyDown = internals.handleKeyDown
    const page = getOwnerDocument(props.event.target)
    const listener = (event: Event) => {
      if (ended) {
        page.removeEventListener('keydown', listener)
        return
      }
      if (event !== props.event) handleKeyDown(event)
    }
    internals.handleKeyDown = listener
    page.addEventListener('keydown', listener)
  }
}
