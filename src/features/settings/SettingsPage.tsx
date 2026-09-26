import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/shared/page-header'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { useInventoryState } from '../../hooks/useInventoryState'

const configurationLinks = [
  { title: 'Warehouses', description: 'Review warehouse capacity and stock summaries.', href: '/warehouses' },
  { title: 'Locations', description: 'Review storage, receiving, and dispatch locations.', href: '/locations' },
  { title: 'Reordering Rules', description: 'Review location-level minimum and maximum quantities.', href: '/reordering-rules' },
  { title: 'My Profile', description: 'Update your account name and review your role.', href: '/profile' },
]

export const SettingsPage = () => {
  const state = useInventoryState()
  return (
    <div className="space-y-4">
      <PageHeader title="Settings" description="Review the workspace configuration used by StockSense." />
      <Card>
        <CardHeader>Current Configuration</CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <div><p className="text-slate-400">Warehouses</p><p className="font-medium">{state.warehouses.length}</p></div>
          <div><p className="text-slate-400">Locations</p><p className="font-medium">{state.locations.length}</p></div>
          <div><p className="text-slate-400">Reordering Rules</p><p className="font-medium">{state.reorderingRules.length}</p></div>
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        {configurationLinks.map((item) => (
          <Link key={item.href} to={item.href} className="rounded-lg border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-slate-700 hover:bg-slate-800">
            <h2 className="font-medium text-slate-100">{item.title}</h2>
            <p className="mt-1 text-sm text-slate-400">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
