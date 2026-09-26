import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ActivityFeed } from '../../components/shared/activity-feed'
import { MetricCard } from '../../components/shared/metric-card'
import { PageHeader } from '../../components/shared/page-header'
import { StatusBadge } from '../../components/shared/status-badge'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { inventoryService } from '../../services/inventoryService'
import { getState } from '../../services/store'
import { useInventoryState } from '../../hooks/useInventoryState'
import { EmptyState } from '../../components/shared/states'

export const DashboardPage = () => {
  const inventoryState = useInventoryState()
  const metrics = useQuery({ queryKey: ['dashboard-metrics'], queryFn: () => inventoryService.getDashboardMetrics() })
  const alerts = useQuery({ queryKey: ['stock-alerts'], queryFn: () => inventoryService.getStockAlerts() })
  const state = inventoryState ?? getState()
  const pendingOperations = [
    ...state.receipts.filter((doc) => doc.status !== 'done' && doc.status !== 'canceled').map((doc) => ({ id: doc.id, number: doc.receiptNumber, status: doc.status, href: `/receipts/${doc.id}` })),
    ...state.deliveries.filter((doc) => doc.status !== 'done' && doc.status !== 'canceled').map((doc) => ({ id: doc.id, number: doc.deliveryNumber, status: doc.status, href: `/deliveries/${doc.id}` })),
    ...state.transfers.filter((doc) => doc.status !== 'done' && doc.status !== 'canceled').map((doc) => ({ id: doc.id, number: doc.transferNumber, status: doc.status, href: `/transfers/${doc.id}` })),
  ].slice(0, 6)

  return (
    <div className="space-y-4">
      <PageHeader title="Dashboard" description="What is happening with inventory right now" />

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard title="Total Products in Stock" value={metrics.data?.totalProductsInStock ?? '--'} />
        <MetricCard title="Low Stock" value={metrics.data?.lowStock ?? '--'} />
        <MetricCard title="Out of Stock" value={metrics.data?.outOfStock ?? '--'} />
        <MetricCard title="Pending Receipts" value={metrics.data?.pendingReceipts ?? '--'} />
        <MetricCard title="Pending Deliveries" value={metrics.data?.pendingDeliveries ?? '--'} />
        <MetricCard title="Internal Transfers" value={metrics.data?.internalTransfers ?? '--'} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>Pending Operations</CardHeader>
          <CardContent className="space-y-2">
            {pendingOperations.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded border border-slate-800 p-2 text-sm">
                <Link className="text-sky-300" to={doc.href}>{doc.number}</Link>
                <StatusBadge status={doc.status[0].toUpperCase() + doc.status.slice(1)} />
              </div>
            ))}
            {pendingOperations.length === 0 ? <EmptyState title="No pending operations" message="Validated and canceled documents are cleared from this list." /> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>Quick Actions</CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <button className="rounded border border-slate-700 p-2 text-left hover:bg-slate-800">New Receipt</button>
            <button className="rounded border border-slate-700 p-2 text-left hover:bg-slate-800">New Delivery</button>
            <button className="rounded border border-slate-700 p-2 text-left hover:bg-slate-800">Internal Transfer</button>
            <button className="rounded border border-slate-700 p-2 text-left hover:bg-slate-800">Stock Adjustment</button>
            <button className="rounded border border-slate-700 p-2 text-left hover:bg-slate-800">New Product</button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>Stock Alerts</CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(alerts.data ?? []).map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded border border-slate-800 p-2">
                <span>{row.product?.name}</span>
                <StatusBadge status={row.status} />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>Recent Activity</CardHeader>
          <CardContent>
            <ActivityFeed
              items={state.moveHistory.slice(0, 5).map((entry) => ({
                title: `${entry.operation}: ${entry.sku} (${entry.quantity > 0 ? '+' : ''}${entry.quantity})`,
                meta: `${new Date(entry.timestamp).toLocaleString()} · ${entry.reference} · ${entry.user}`,
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
