import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '../../components/shared/data-table'
import { PageHeader } from '../../components/shared/page-header'
import { locationService } from '../../services/locationService'
import { getState } from '../../services/store'

export const LocationsPage = () => {
  const query = useQuery({ queryKey: ['locations'], queryFn: () => locationService.getLocations() })
  const state = getState()
  return (
    <div className="space-y-4">
      <PageHeader title="Locations" description="Storage, production, receiving, and dispatch points" />
      <DataTable data={query.data ?? []} columns={[
        { key: 'name', header: 'Location Name', render: (row) => <Link className="text-sky-300" to={`/locations/${row.id}`}>{row.name}</Link> },
        { key: 'code', header: 'Short Code', render: (row) => row.shortCode },
        { key: 'warehouse', header: 'Warehouse', render: (row) => state.warehouses.find((w) => w.id === row.warehouseId)?.name },
        { key: 'type', header: 'Location Type', render: (row) => row.type },
        { key: 'stock', header: 'Stock Count', render: (row) => row.stockCount },
        { key: 'status', header: 'Status', render: (row) => row.status },
      ]} />
    </div>
  )
}

export const LocationDetailPage = () => {
  const { locationId = '' } = useParams()
  const state = getState()
  const location = state.locations.find((l) => l.id === locationId)
  if (!location) return <p className="text-sm text-slate-400">Location not found.</p>

  const stock = state.stockItems.filter((s) => s.locationId === location.id)
  const movements = state.moveHistory.filter((m) => m.source.includes(location.shortCode) || m.destination.includes(location.shortCode))

  return (
    <div className="space-y-4">
      <PageHeader title={location.name} description={`${location.shortCode} · ${location.type}`} />
      <DataTable data={stock} columns={[{ key: 'product', header: 'Products Stored', render: (row) => state.products.find((p) => p.id === row.productId)?.name }, { key: 'qty', header: 'Quantity', render: (row) => row.onHand }]} />
      <DataTable data={movements} columns={[{ key: 'ref', header: 'Reference', render: (row) => row.reference }, { key: 'operation', header: 'Operation', render: (row) => row.operation }, { key: 'qty', header: 'Quantity', render: (row) => row.quantity }]} />
    </div>
  )
}
