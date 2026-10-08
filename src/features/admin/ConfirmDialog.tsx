import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from '@/components/Button'

export type ConfirmDialogProps = {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  /** `danger` for a delete. */
  tone?: 'primary' | 'danger'
  /** The confirm button stays off until this is true (a typed name). */
  canConfirm?: boolean
  pending?: boolean
  onConfirm: () => void
  /** The dialog closed itself (Escape, Cancel or the backdrop): the owner's `open` follows. */
  onClose: () => void
}

/**
 * A native modal `<dialog>`: the browser traps focus, inerts the page behind, closes on Escape and returns focus to the
 * button that opened it. The owner decides `open`; closing is always the dialog's own, which reaches the owner through
 * `onClose`. Cancel is the first thing in the tab order after the text, so the safe answer is the nearest.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  tone = 'primary',
  canConfirm = true,
  pending,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const dialog = useRef<HTMLDialogElement | null>(null)

  useEffect(() => {
    // The ref is set before any effect runs.
    const element = dialog.current!
    if (open && !element.open) element.showModal()
    if (!open && element.open) element.close()
  }, [open])

  return (
    <dialog
      ref={(element) => {
        dialog.current = element
        const onClick = (event: MouseEvent) => {
          if (event.target === element) element?.close()
        }
        element?.addEventListener('click', onClick)
        return () => element?.removeEventListener('click', onClick)
      }}
      className="admin-dialog"
      aria-labelledby="admin-dialog-title"
      onClose={onClose}
    >
      <h2 id="admin-dialog-title">{title}</h2>
      <div className="stack">{children}</div>
      <div className="admin-dialog-actions">
        <Button variant="secondary" onClick={() => dialog.current?.close()}>
          Cancel
        </Button>
        <Button variant={tone} disabled={!canConfirm} loading={pending} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  )
}
