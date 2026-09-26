import { StatusBadge } from './status-badge'

export const StockStatusIndicator = ({ available, reorderPoint }: { available: number; reorderPoint: number }) => {
  if (available <= 0) return <StatusBadge status="Out of Stock" />
  if (available <= reorderPoint) return <StatusBadge status="Low Stock" />
  return <StatusBadge status="In Stock" />
}
