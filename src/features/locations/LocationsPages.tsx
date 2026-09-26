import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '../../components/shared/data-table'
import { EmptyState, ErrorState, LoadingState } from '../../components/shared/states'
import { PageHeader } from '../../components/shared/page-header'
import { locationService } from '../../services/locationService'

export const LocationsPage = () => {
  const query = useQuery({ queryKey: ['locations'], queryFn: () => locationService.getLocations() })
  return (
    <div className="space-y-4">
      <PageHeader title="Locations" description="Storage, production, receiving, and dispatch points" />
      {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message="Locations could not be loaded. Please try again." /> : !query.data?.length ? <EmptyState title="No locations" message="Create locations to organize warehouse stock." /> : (
        <DataTable data={query.data} columns={[
          { key: 'name', header: 'Location Name', render: (row) => <Link className="text-sky-300" to={`/locations/${row.id}`}>{row.name}</Link> },
          { key: 'code', header: 'Code', render: (row) => row.shortCode },
          { key: 'warehouse', header: 'Warehouse', render: (row) => row.warehouse?.name ?? 'Unknown' },
          { key: 'type', header: 'Location Type', render: (row) => row.type },
          { key: 'stock', header: 'Stock Count', render: (row) => row.stockCount },
          { key: 'status', header: 'Status', render: (row) => row.status },
        ]} />
      )}
    </div>
  )
}

export const LocationDetailPage = () => {
  const { locationId = '' } = useParams()
  const query = useQuery({ queryKey: ['location-detail', locationId], queryFn: () => locationService.getLocationDetail(locationId) })
  if (query.isLoading) return <LoadingState />
  if (query.isError) return <ErrorState message="Location details could not be loaded. Please try again." />
  const detail = query.data
  if (!detail) return <EmptyState title="Location not found" message="This location may have been removed." />
  const { location } = detail

  return (
    <div className="space-y-4">
      <PageHeader title={location.name} description={`${location.shortCode} · ${location.type} · ${detail.warehouse?.name ?? 'Unknown warehouse'}`} />
      {detail.stock.length ? <DataTable data={detail.stock} columns={[
        { key: 'product', header: 'Product', render: (row) => row.product ? <Link className="text-sky-300" to={`/products/${row.product.id}`}>{row.product.name}</Link> : 'Unknown product' },
        { key: 'sku', header: 'SKU', render: (row) => row.product?.sku ?? '—' },
        { key: 'onHand', header: 'On Hand', render: (row) => row.onHand },
        { key: 'reserved', header: 'Reserved', render: (row) => row.reserved },
        { key: 'available', header: 'Available', render: (row) => row.available },
      ]} /> : <EmptyState title="No products in this location" message="Stock will appear after an initial balance, receipt, or transfer." />}
      <section className="space-y-2"><h2 className="text-sm font-semibold text-slate-200">Recent Movements</h2>
        {detail.recentMoves.length ? <DataTable data={detail.recentMoves} columns={[
          { key: 'date', header: 'Date', render: (row) => new Date(row.timestamp).toLocaleString() },
          { key: 'reference', header: 'Reference', render: (row) => row.reference },
          { key: 'operation', header: 'Operation', render: (row) => row.operation },
          { key: 'product', header: 'Product', render: (row) => <Link className="text-sky-300" to={`/products/${row.productId}`}>{row.sku}</Link> },
          { key: 'quantity', header: 'Quantity', render: (row) => row.quantity },
          { key: 'source', header: 'Source', render: (row) => row.source },
          { key: 'destination', header: 'Destination', render: (row) => row.destination },
        ]} /> : <EmptyState title="No recent movements" message="Movements involving this location will appear here." />}
      </section>
    </div>
  )
}
