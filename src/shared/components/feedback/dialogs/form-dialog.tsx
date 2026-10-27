import type { FormEventHandler, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  type ModalProps,
} from '@/shared/components/feedback/dialogs/modal'
import { Form } from '@/shared/components/forms/layout/form'
import { Alert, Button } from '@/shared/components/ui'

export type FormDialogProps = {
  open: boolean
  onClose: () => void
  /** While saving: the dialog stays open and its buttons wait. */
  busy: boolean
  title: ReactNode
  description?: ReactNode
  /** A save error that belongs to no field, in a red banner under the header. */
  error?: string | null
  /** Above the fields, under the header: a note or a warning of the dialog's own. */
  notice?: ReactNode
  onSubmit: FormEventHandler<HTMLFormElement>
  submitLabel: ReactNode
  /** Why saving cannot happen yet, as the button's tooltip; set, the button is off. */
  submitBlocked?: string
  size?: ModalProps['size']
  className?: string
  children: ReactNode
}

/**
 * Every dialog that is a form (a category, a dish, a link, tables): its
 * header, then a save error, a notice and the fields, then Cancel and the
 * save button on a hairline. One shell, so they all read and behave alike.
 */
export function FormDialog({
  open,
  onClose,
  busy,
  title,
  description,
  error,
  notice,
  onSubmit,
  submitLabel,
  submitBlocked,
  size,
  className,
  children,
}: FormDialogProps) {
  const { t } = useTranslation()

  return (
    <Modal open={open} onClose={onClose} busy={busy} size={size} className={className}>
      <Form onSubmit={onSubmit} className="gap-0">
        <ModalBody>
          <ModalHeader title={title} description={description} />
          {error ? (
            <Alert variant="error" className="mt-3">
              {error}
            </Alert>
          ) : null}
          {notice}
          {children}
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t('dialog.cancel')}
          </Button>
          <Button
            type="submit"
            loading={busy}
            disabled={submitBlocked !== undefined}
            title={submitBlocked}
          >
            {submitLabel}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}
