import { Badge } from '../ui/badge'

const toneMap: Record<string, string> = {
  'In Stock': 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50',
  'Low Stock': 'bg-amber-900/40 text-amber-300 border border-amber-700/50',
  'Out of Stock': 'bg-red-900/40 text-red-300 border border-red-700/50',
  Done: 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50',
  Ready: 'bg-sky-900/40 text-sky-300 border border-sky-700/50',
  Waiting: 'bg-amber-900/40 text-amber-300 border border-amber-700/50',
  Draft: 'bg-slate-800 text-slate-300 border border-slate-700',
  Canceled: 'bg-red-900/40 text-red-300 border border-red-700/50',
  Applied: 'bg-violet-900/40 text-violet-300 border border-violet-700/50',
  Critical: 'bg-red-900/40 text-red-300 border border-red-700/50',
  'Reorder Required': 'bg-amber-900/40 text-amber-300 border border-amber-700/50',
  Healthy: 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50',
}

export const StatusBadge = ({ status }: { status: string }) => (
  <Badge className={toneMap[status] ?? 'bg-slate-800 text-slate-300 border border-slate-700'}>{status}</Badge>
)
