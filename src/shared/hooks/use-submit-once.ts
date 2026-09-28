import { useCallback, useRef } from 'react'

/**
 * Lets one submission through at a time. A double click submits twice before
 * the button can re-render as busy, so a mutation's `isPending` is still false
 * for the second one; without this guard a dialog that creates something
 * creates it twice.
 *
 * `once((done) => save.mutate(values, { onSettled: done }))`: the next
 * submission is allowed once `done` is called.
 */
export function useSubmitOnce() {
  const busy = useRef(false)

  return useCallback((run: (done: () => void) => void) => {
    if (busy.current) return
    busy.current = true
    run(() => {
      busy.current = false
    })
  }, [])
}
