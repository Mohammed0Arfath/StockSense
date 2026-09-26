import { LogOut, Menu } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { cn } from '../lib/utils'
import { bottomNav, navSections } from './navigation'
import { useAuth } from '../hooks/useAuth'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

export const Sidebar = ({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) => {
  const { logout } = useAuth()

  const sidebar = (
    <aside className={cn('h-full border-r border-slate-800 bg-slate-950 p-3', collapsed ? 'w-20' : 'w-72')}>
      <div className="mb-4 flex items-center justify-between">
        <span className={cn('font-semibold text-slate-100', collapsed && 'sr-only')}>StockSense</span>
        <Button variant="ghost" size="icon" onClick={onToggle} aria-label="Toggle sidebar">
          <Menu className="h-4 w-4" />
        </Button>
      </div>
      <nav className="space-y-4">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className={cn('mb-2 px-2 text-xs uppercase tracking-wide text-slate-500', collapsed && 'sr-only')}>{section.title}</p>
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onMobileClose}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-300 hover:bg-slate-800',
                      isActive && 'bg-slate-800 text-sky-300',
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {!collapsed ? item.label : null}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-6 space-y-1 border-t border-slate-800 pt-4">
        {bottomNav.map((item) => (
          <NavLink key={item.path} to={item.path} onClick={onMobileClose} className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-300 hover:bg-slate-800">
            <item.icon className="h-4 w-4" />
            {!collapsed ? item.label : null}
          </NavLink>
        ))}
        <button onClick={logout} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-300 hover:bg-slate-800">
          <LogOut className="h-4 w-4" />
          {!collapsed ? 'Logout' : null}
        </button>
      </div>
    </aside>
  )

  return (
    <>
      <div className="hidden h-screen md:block">{sidebar}</div>
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 bg-black/70 md:hidden" onClick={onMobileClose}>
          <div className="h-full w-72" onClick={(e) => e.stopPropagation()}>
            {sidebar}
          </div>
        </div>
      ) : null}
    </>
  )
}
