import { useId } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

interface DialogProps {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

export const Dialog = ({ open, title, onClose, children }: DialogProps) => {
  const titleId = useId()
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-xl rounded-lg border border-slate-700 bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <h3 id={titleId} className="font-semibold text-slate-100">{title}</h3>
          <button className={cn('rounded p-1 text-slate-400 hover:bg-slate-800')} onClick={onClose} aria-label="Close dialog">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
