import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '../../components/shared/data-table'
import { EmptyState, ErrorState, LoadingState } from '../../components/shared/states'
import { MetricCard } from '../../components/shared/metric-card'
import { PageHeader } from '../../components/shared/page-header'
import { warehouseService } from '../../services/warehouseService'

export const WarehousesPage = () => {
  const query = useQuery({ queryKey: ['warehouses'], queryFn: () => warehouseService.getWarehouses() })
  return (
    <div className="space-y-4">
      <PageHeader title="Warehouses" description="Manage warehouse network and stock health" />
      {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message="Warehouses could not be loaded. Please try again." /> : !query.data?.length ? <EmptyState title="No warehouses" message="Add a warehouse to organize inventory." /> : (
        <DataTable data={query.data} columns={[
          { key: 'name', header: 'Warehouse', render: (row) => <Link className="text-sky-300" to={`/warehouses/${row.id}`}>{row.name}</Link> },
          { key: 'code', header: 'Code', render: (row) => row.code },
          { key: 'address', header: 'Address', render: (row) => row.address },
          { key: 'products', header: 'Total Products', render: (row) => row.totalProducts },
          { key: 'units', header: 'Total Units', render: (row) => row.totalUnits },
          { key: 'status', header: 'Status', render: (row) => row.status },
        ]} />
      )}
    </div>
  )
}

export const WarehouseDetailPage = () => {
  const { warehouseId = '' } = useParams()
  const query = useQuery({ queryKey: ['warehouse-detail', warehouseId], queryFn: () => warehouseService.getWarehouseDetail(warehouseId) })
  if (query.isLoading) return <LoadingState />
  if (query.isError) return <ErrorState message="Warehouse details could not be loaded. Please try again." />
  const detail = query.data
  if (!detail) return <EmptyState title="Warehouse not found" message="This warehouse may have been removed." />
  const { warehouse } = detail

  return (
    <div className="space-y-4">
      <PageHeader title={warehouse.name} description={`${warehouse.code} · ${warehouse.address}`} />
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard title="Products" value={detail.totalProducts} />
        <MetricCard title="On Hand Units" value={detail.totalUnits} />
        <MetricCard title="Locations" value={detail.locations.length} />
      </div>
      <section className="space-y-2"><h2 className="text-sm font-semibold text-slate-200">Locations</h2>
        {detail.locations.length ? <DataTable data={detail.locations} columns={[
          { key: 'name', header: 'Location', render: (row) => <Link className="text-sky-300" to={`/locations/${row.id}`}>{row.name}</Link> },
          { key: 'code', header: 'Code', render: (row) => row.shortCode },
          { key: 'type', header: 'Type', render: (row) => row.type },
          { key: 'status', header: 'Status', render: (row) => row.status },
        ]} /> : <EmptyState title="No locations" message="This warehouse has no locations configured." />}
      </section>
      <section className="space-y-2"><h2 className="text-sm font-semibold text-slate-200">Stock Summary</h2>
        {detail.stock.length ? <DataTable data={detail.stock} columns={[
          { key: 'product', header: 'Product', render: (row) => row.product ? <Link className="text-sky-300" to={`/products/${row.product.id}`}>{row.product.name}</Link> : 'Unknown product' },
          { key: 'location', header: 'Location', render: (row) => <Link className="text-sky-300" to={`/locations/${row.locationId}`}>{detail.locations.find((location) => location.id === row.locationId)?.name ?? 'Unknown'}</Link> },
          { key: 'onHand', header: 'On Hand', render: (row) => row.onHand },
          { key: 'reserved', header: 'Reserved', render: (row) => row.reserved },
          { key: 'available', header: 'Available', render: (row) => row.available },
        ]} /> : <EmptyState title="No stock in this warehouse" message="Stock will appear after an initial balance or receipt." />}
      </section>
      <section className="space-y-2"><h2 className="text-sm font-semibold text-slate-200">Recent Operations</h2>
        {detail.recentMoves.length ? <DataTable data={detail.recentMoves} columns={[
          { key: 'date', header: 'Date', render: (row) => new Date(row.timestamp).toLocaleString() },
          { key: 'reference', header: 'Reference', render: (row) => row.reference },
          { key: 'operation', header: 'Operation', render: (row) => row.operation },
          { key: 'sku', header: 'SKU', render: (row) => <Link className="text-sky-300" to={`/products/${row.productId}`}>{row.sku}</Link> },
          { key: 'quantity', header: 'Quantity', render: (row) => row.quantity },
        ]} /> : <EmptyState title="No recent operations" message="Inventory movements for this warehouse will appear here." />}
      </section>
    </div>
  )
}
