import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '../../components/shared/data-table'
import { EmptyState, ErrorState, LoadingState } from '../../components/shared/states'
import { FilterDropdown } from '../../components/shared/filters'
import { MetricCard } from '../../components/shared/metric-card'
import { PageHeader } from '../../components/shared/page-header'
import { StatusBadge } from '../../components/shared/status-badge'
import { inventoryService } from '../../services/inventoryService'
import { useInventoryState } from '../../hooks/useInventoryState'

const EMPTY_STOCK_ROWS: Awaited<ReturnType<typeof inventoryService.getStockView>> = []

export const StockPage = () => {
  const state = useInventoryState()
  const [warehouse, setWarehouse] = useState('all')
  const [location, setLocation] = useState('all')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')

  const stockQuery = useQuery({ queryKey: ['stock-view'], queryFn: () => inventoryService.getStockView() })
  const rows = stockQuery.data ?? EMPTY_STOCK_ROWS

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        const matchesWarehouse = warehouse === 'all' || row.warehouseId === warehouse
        const matchesLocation = location === 'all' || row.locationId === location
        const matchesCategory = category === 'all' || row.product?.categoryId === category
        const matchesStatus = status === 'all' || row.status === status
        return matchesWarehouse && matchesLocation && matchesCategory && matchesStatus
      }),
    [rows, warehouse, location, category, status],
  )

  return (
    <div className="space-y-4">
      <PageHeader title="Stock" description="Inventory position by warehouse and location" />
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard title="On Hand" value={filtered.reduce((sum, row) => sum + row.onHand, 0)} />
        <MetricCard title="Reserved" value={filtered.reduce((sum, row) => sum + row.reserved, 0)} />
        <MetricCard title="Available" value={filtered.reduce((sum, row) => sum + row.available, 0)} />
      </div>
      <div className="grid gap-2 md:grid-cols-4">
        <FilterDropdown value={warehouse} onChange={(value) => { setWarehouse(value); setLocation('all') }} options={[{ label: 'All Warehouses', value: 'all' }, ...state.warehouses.map((w) => ({ label: w.name, value: w.id }))]} />
        <FilterDropdown value={location} onChange={setLocation} options={[{ label: 'All Locations', value: 'all' }, ...state.locations.filter((item) => warehouse === 'all' || item.warehouseId === warehouse).map((l) => ({ label: l.name, value: l.id }))]} />
        <FilterDropdown value={category} onChange={setCategory} options={[{ label: 'All Categories', value: 'all' }, ...state.categories.map((c) => ({ label: c.name, value: c.id }))]} />
        <FilterDropdown value={status} onChange={setStatus} options={[{ label: 'All Status', value: 'all' }, { label: 'In Stock', value: 'In Stock' }, { label: 'Low Stock', value: 'Low Stock' }, { label: 'Out of Stock', value: 'Out of Stock' }]} />
      </div>
      {stockQuery.isLoading ? <LoadingState /> : stockQuery.isError ? <ErrorState message="Stock could not be loaded. Please try again." /> : filtered.length === 0 ? (
        <EmptyState title={rows.length ? 'No matching stock' : 'No stock records'} message={rows.length ? 'Adjust your filters to see stock.' : 'Stock will appear here after an initial balance or receipt.'} />
      ) : <DataTable
        data={filtered}
        columns={[
          { key: 'product', header: 'Product', render: (row) => row.product?.name },
          { key: 'sku', header: 'SKU', render: (row) => row.product?.sku },
          { key: 'warehouse', header: 'Warehouse', render: (row) => row.warehouse?.name },
          { key: 'location', header: 'Location', render: (row) => row.location?.name },
          { key: 'onHand', header: 'On Hand', render: (row) => row.onHand },
          { key: 'reserved', header: 'Reserved', render: (row) => row.reserved },
          { key: 'available', header: 'Available', render: (row) => row.available },
          { key: 'reorder', header: 'Reorder Point', render: (row) => row.product?.reorderPoint },
          { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
        ]}
      />}
    </div>
  )
}
