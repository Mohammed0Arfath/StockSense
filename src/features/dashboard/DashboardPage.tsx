import { useState } from 'react'
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
import { ProductFormDialog } from '../products/ProductFormDialog'
import { getInventoryHealth, getOperationalInsights, getReorderInsights, getStockRiskInsights } from '../../services/inventoryIntelligence'

const InsightLinks = ({ items }: { items: { id: string; title: string; reason: string; href: string; severity?: string }[] }) => (
  <div className="space-y-2">
    {items.map((item) => <div key={item.id} className="flex items-start justify-between gap-3 rounded border border-slate-800 p-2 text-sm">
      <div className="min-w-0"><Link className="text-sky-300 hover:underline" to={item.href}>{item.title}</Link><p className="mt-1 text-xs text-slate-400">{item.reason}</p></div>
      {item.severity ? <StatusBadge status={item.severity} /> : null}
    </div>)}
    {items.length === 0 ? <EmptyState title="No insights" message="There are no matching inventory insights in the current data." /> : null}
  </div>
)

export const DashboardPage = () => {
  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const inventoryState = useInventoryState()
  const metrics = useQuery({ queryKey: ['dashboard-metrics'], queryFn: () => inventoryService.getDashboardMetrics() })
  const alerts = useQuery({ queryKey: ['stock-alerts'], queryFn: () => inventoryService.getStockAlerts() })
  const state = inventoryState ?? getState()
  const health = getInventoryHealth(state)
  const reorderInsights = getReorderInsights(state)
  const stockRisks = getStockRiskInsights(state)
  const operationalInsights = getOperationalInsights(state).slice(0, 8)
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
            <Link className="rounded border border-slate-700 p-2 text-left hover:bg-slate-800" to="/receipts/new">New Receipt</Link>
            <Link className="rounded border border-slate-700 p-2 text-left hover:bg-slate-800" to="/deliveries/new">New Delivery</Link>
            <Link className="rounded border border-slate-700 p-2 text-left hover:bg-slate-800" to="/transfers/new">Internal Transfer</Link>
            <Link className="rounded border border-slate-700 p-2 text-left hover:bg-slate-800" to="/adjustments/new">Stock Adjustment</Link>
            <button className="rounded border border-slate-700 p-2 text-left hover:bg-slate-800" onClick={() => setProductDialogOpen(true)}>New Product</button>
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
            {alerts.isFetched && alerts.data?.length === 0 ? <EmptyState title="No stock alerts" message="All tracked stock is above its reorder threshold." /> : null}
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
            {state.moveHistory.length === 0 ? <EmptyState title="No recent activity" message="Validated stock operations will appear here." /> : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>Inventory Health</CardHeader>
          <CardContent><InsightLinks items={health.sort((a, b) => ['Critical', 'Attention', 'Healthy'].indexOf(a.status) - ['Critical', 'Attention', 'Healthy'].indexOf(b.status)).slice(0, 8).map((item) => ({ id: item.product.id, title: `${item.product.name} · ${item.status}`, reason: item.reason, href: item.href, severity: item.status }))} /></CardContent>
        </Card>
        <Card>
          <CardHeader>Smart Reorder Suggestions</CardHeader>
          <CardContent><InsightLinks items={reorderInsights.slice(0, 8).map((item) => ({ id: `${item.product.id}:${item.locationId}`, title: `${item.product.name} · ${item.suggestedQuantity} ${item.product.unit}`, reason: `Current: ${item.available} · Reorder point: ${item.reorderPoint} · Suggested: max (${item.maxQuantity}) − current (${item.available}) = ${item.suggestedQuantity}. ${item.reason} ${item.warehouseName} / ${item.locationName}.`, href: item.href }))} /></CardContent>
        </Card>
        <Card>
          <CardHeader>Stock Risk</CardHeader>
          <CardContent><InsightLinks items={stockRisks.slice(0, 8)} /></CardContent>
        </Card>
        <Card>
          <CardHeader><div>Operational Insights</div><p className="mt-1 text-xs text-slate-400">Movement and adjustment insights use recorded history from the last 30 days.</p></CardHeader>
          <CardContent><InsightLinks items={operationalInsights} /></CardContent>
        </Card>
      </div>
      {productDialogOpen ? <ProductFormDialog onClose={() => setProductDialogOpen(false)} /> : null}
    </div>
  )
}
