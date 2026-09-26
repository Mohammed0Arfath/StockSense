import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '../../components/shared/data-table'
import { MetricCard } from '../../components/shared/metric-card'
import { PageHeader } from '../../components/shared/page-header'
import { StatusBadge } from '../../components/shared/status-badge'
import { Button } from '../../components/ui/button'
import { productService } from '../../services/productService'
import { getState } from '../../services/store'
import { aggregateProductStock } from '../../utils/inventory'

export const ProductDetailPage = () => {
  const { productId = '' } = useParams()
  const state = getState()
  const productQuery = useQuery({ queryKey: ['product', productId], queryFn: () => productService.getProduct(productId) })
  const product = productQuery.data
  if (!product) return <p className="text-sm text-slate-400">Product not found.</p>

  const aggregate = aggregateProductStock(product, state.stockItems)
  const status = aggregate.available <= 0 ? 'Out of Stock' : aggregate.available <= product.reorderPoint ? 'Low Stock' : 'In Stock'

  const stockByLocation = state.stockItems.filter((item) => item.productId === product.id)
  const receipts = state.receipts.flatMap((receipt) => receipt.lines.filter((line) => line.productId === product.id).map((line) => ({ receipt, line })))
  const deliveries = state.deliveries.flatMap((delivery) => delivery.lines.filter((line) => line.productId === product.id).map((line) => ({ delivery, line })))

  return (
    <div className="space-y-4">
      <PageHeader title={product.name} description={`${product.sku} · ${state.categories.find((c) => c.id === product.categoryId)?.name ?? '-'}`} />
      <StatusBadge status={status} />
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard title="On Hand" value={aggregate.onHand} />
        <MetricCard title="Reserved" value={aggregate.reserved} />
        <MetricCard title="Available" value={aggregate.available} />
        <MetricCard title="Reorder Point" value={product.reorderPoint} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary">Edit Product</Button>
        <Button variant="secondary">Create Receipt</Button>
        <Button variant="secondary">Create Delivery</Button>
        <Button variant="secondary">Adjust Stock</Button>
        <Button variant="secondary">Transfer Stock</Button>
      </div>

      <DataTable
        data={stockByLocation}
        columns={[
          { key: 'warehouse', header: 'Warehouse', render: (row) => state.warehouses.find((w) => w.id === row.warehouseId)?.name },
          { key: 'location', header: 'Location', render: (row) => state.locations.find((l) => l.id === row.locationId)?.name },
          { key: 'onHand', header: 'On Hand', render: (row) => row.onHand },
          { key: 'reserved', header: 'Reserved', render: (row) => row.reserved },
          { key: 'available', header: 'Available', render: (row) => Math.max(row.onHand - row.reserved, 0) },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <DataTable
          data={receipts}
          columns={[
            { key: 'id', header: 'Recent Receipts', render: (row) => row.receipt.receiptNumber },
            { key: 'qty', header: 'Quantity', render: (row) => row.line.expectedQuantity },
            { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.receipt.status[0].toUpperCase() + row.receipt.status.slice(1)} /> },
          ]}
        />
        <DataTable
          data={deliveries}
          columns={[
            { key: 'id', header: 'Recent Deliveries', render: (row) => row.delivery.deliveryNumber },
            { key: 'qty', header: 'Quantity', render: (row) => row.line.requestedQuantity },
            { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.delivery.status[0].toUpperCase() + row.delivery.status.slice(1)} /> },
          ]}
        />
      </div>
    </div>
  )
}
