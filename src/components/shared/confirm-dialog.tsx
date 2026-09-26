import { Button } from '../ui/button'
import { Dialog } from '../ui/dialog'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
}

export const ConfirmDialog = ({ open, title, message, confirmLabel, onCancel, onConfirm }: ConfirmDialogProps) => (
  <Dialog open={open} title={title} onClose={onCancel}>
    <p className="text-sm text-slate-300">{message}</p>
    <div className="mt-4 flex justify-end gap-2">
      <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      <Button onClick={onConfirm}>{confirmLabel}</Button>
    </div>
  </Dialog>
)
