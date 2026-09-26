import { useQuery } from '@tanstack/react-query'
import { DataTable } from '../../components/shared/data-table'
import { EmptyState, ErrorState, LoadingState } from '../../components/shared/states'
import { PageHeader } from '../../components/shared/page-header'
import { StatusBadge } from '../../components/shared/status-badge'
import { reorderingRuleService } from '../../services/reorderingRuleService'

export const ReorderingRulesPage = () => {
  const query = useQuery({ queryKey: ['reordering-rules'], queryFn: () => reorderingRuleService.getRules() })
  return (
    <div className="space-y-4">
      <PageHeader title="Reordering Rules" description="Location-based replenishment thresholds and low-stock alerts" />
      {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message="Reordering rules could not be loaded. Please try again." /> : !query.data?.length ? <EmptyState title="No reordering rules" message="There are no replenishment thresholds configured." /> : (
        <DataTable data={query.data} columns={[
          { key: 'product', header: 'Product', render: (row) => row.product?.name ?? 'Unknown product' },
          { key: 'sku', header: 'SKU', render: (row) => row.product?.sku ?? '—' },
          { key: 'warehouse', header: 'Warehouse', render: (row) => row.warehouse?.name ?? 'Unknown' },
          { key: 'location', header: 'Location', render: (row) => row.location?.name ?? 'Unknown' },
          { key: 'min', header: 'Minimum Quantity', render: (row) => row.minQty },
          { key: 'max', header: 'Maximum Quantity', render: (row) => row.maxQty },
          { key: 'current', header: 'Available Quantity', render: (row) => row.currentQty },
          { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
        ]} />
      )}
    </div>
  )
}
