import { Menu } from 'lucide-react'
import { CommandMenu } from '../components/shared/command-menu'
import { useAuth } from '../hooks/useAuth'
import { useInventoryState } from '../hooks/useInventoryState'

export const Topbar = ({ title, onMobileOpen }: { title: string; onMobileOpen: () => void }) => {
  const { user } = useAuth()
  const state = useInventoryState()
  const warehouseName = state.warehouses.find((warehouse) => warehouse.id === user?.warehouseId)?.name

  return (
    <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3">
        <button className="rounded-md border border-slate-700 p-2 text-slate-300 md:hidden" onClick={onMobileOpen} aria-label="Open menu">
          <Menu className="h-4 w-4" />
        </button>
        <div>
          <p className="text-xs text-slate-400">Stock Operations</p>
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        </div>
        <div className="min-w-56 flex-1"><CommandMenu /></div>
        <p className="hidden text-xs text-slate-400 lg:block">{warehouseName ?? 'All warehouses'}</p>
        <div className="text-right text-sm text-slate-300">
          <p>{user?.name}</p>
          <p className="text-xs text-slate-500">{user?.role}</p>
        </div>
      </div>
    </header>
  )
}
