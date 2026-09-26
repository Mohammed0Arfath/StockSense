import { useQuery } from '@tanstack/react-query'
import { DataTable } from '../../components/shared/data-table'
import { PageHeader } from '../../components/shared/page-header'
import { StatusBadge } from '../../components/shared/status-badge'
import { reorderingRuleService } from '../../services/reorderingRuleService'
import { getState } from '../../services/store'

export const ReorderingRulesPage = () => {
  const query = useQuery({ queryKey: ['reordering-rules'], queryFn: () => reorderingRuleService.getRules() })
  const state = getState()
  return (
    <div className="space-y-4">
      <PageHeader title="Reordering Rules" description="Connected to low-stock alerts and replenishment thresholds" />
      <DataTable data={query.data ?? []} columns={[
        { key: 'product', header: 'Product', render: (row) => state.products.find((p) => p.id === row.productId)?.name },
        { key: 'sku', header: 'SKU', render: (row) => state.products.find((p) => p.id === row.productId)?.sku },
        { key: 'warehouse', header: 'Warehouse', render: (row) => state.warehouses.find((w) => w.id === row.warehouseId)?.name },
        { key: 'location', header: 'Location', render: (row) => state.locations.find((l) => l.id === row.locationId)?.name },
        { key: 'min', header: 'Minimum Quantity', render: (row) => row.minQty },
        { key: 'max', header: 'Maximum Quantity', render: (row) => row.maxQty },
        { key: 'current', header: 'Current Quantity', render: (row) => row.currentQty },
        { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
      ]} />
    </div>
  )
}
