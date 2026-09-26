import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '../../components/shared/data-table'
import { PageHeader } from '../../components/shared/page-header'
import { warehouseService } from '../../services/warehouseService'
import { getState } from '../../services/store'

export const WarehousesPage = () => {
  const query = useQuery({ queryKey: ['warehouses'], queryFn: () => warehouseService.getWarehouses() })
  return (
    <div className="space-y-4">
      <PageHeader title="Warehouses" description="Manage warehouse network and stock health" />
      <DataTable data={query.data ?? []} columns={[
        { key: 'name', header: 'Warehouse Name', render: (row) => <Link className="text-sky-300" to={`/warehouses/${row.id}`}>{row.name}</Link> },
        { key: 'code', header: 'Code', render: (row) => row.code },
        { key: 'address', header: 'Address', render: (row) => row.address },
        { key: 'products', header: 'Total Products', render: (row) => row.totalProducts },
        { key: 'units', header: 'Total Units', render: (row) => row.totalUnits },
        { key: 'status', header: 'Status', render: (row) => row.status },
      ]} />
    </div>
  )
}

export const WarehouseDetailPage = () => {
  const { warehouseId = '' } = useParams()
  const state = getState()
  const warehouse = state.warehouses.find((w) => w.id === warehouseId)
  if (!warehouse) return <p className="text-sm text-slate-400">Warehouse not found.</p>

  const locations = state.locations.filter((l) => l.warehouseId === warehouse.id)
  const stock = state.stockItems.filter((s) => s.warehouseId === warehouse.id)

  return (
    <div className="space-y-4">
      <PageHeader title={warehouse.name} description={warehouse.address} />
      <DataTable data={locations} columns={[{ key: 'name', header: 'Locations', render: (row) => row.name }, { key: 'type', header: 'Type', render: (row) => row.type }, { key: 'status', header: 'Status', render: (row) => row.status }]} />
      <DataTable data={stock} columns={[{ key: 'product', header: 'Product', render: (row) => state.products.find((p) => p.id === row.productId)?.name }, { key: 'onhand', header: 'On Hand', render: (row) => row.onHand }, { key: 'reserved', header: 'Reserved', render: (row) => row.reserved }]} />
    </div>
  )
}
