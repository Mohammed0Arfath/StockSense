import { useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useInventorySync } from '../hooks/useInventorySync'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

const titleFromPath = (pathname: string) =>
  pathname
    .split('/')[1]
    .replace(/-/g, ' ')
    .replace(/^./, (v) => v.toUpperCase()) || 'Dashboard'

export const AppLayout = () => {
  useInventorySync()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const title = useMemo(() => titleFromPath(location.pathname), [location.pathname])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 md:flex">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((current) => !current)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex-1">
        <Topbar title={title} onMobileOpen={() => setMobileOpen(true)} />
        <main className="space-y-6 p-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
