import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Modal, ModalHeader } from '@/shared/components/feedback/dialogs/modal'

describe('Modal', () => {
  it('is named by its ModalHeader without the caller wiring ids', () => {
    const { container } = render(
      <Modal open onClose={vi.fn()}>
        <ModalHeader title="Rename table" description="The table keeps its QR code." />
      </Modal>,
    )

    expect(container.querySelector('dialog')).toHaveAccessibleName('Rename table')
  })
})
