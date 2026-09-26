import { Button } from '../ui/button'

interface PageHeaderProps {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export const PageHeader = ({ title, description, actionLabel, onAction }: PageHeaderProps) => (
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 className="text-2xl font-semibold text-slate-100">{title}</h1>
      {description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
    </div>
    {actionLabel && onAction ? <Button onClick={onAction}>{actionLabel}</Button> : null}
  </div>
)
