import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '../../components/shared/data-table'
import { EmptyState, ErrorState, LoadingState } from '../../components/shared/states'
import { MetricCard } from '../../components/shared/metric-card'
import { PageHeader } from '../../components/shared/page-header'
import { StatusBadge } from '../../components/shared/status-badge'
import { Button } from '../../components/ui/button'
import { productService } from '../../services/productService'
import { ProductFormDialog } from './ProductFormDialog'

export const ProductDetailPage = () => {
  const { productId = '' } = useParams()
  const navigate = useNavigate()
  const [editOpen, setEditOpen] = useState(false)
  const query = useQuery({ queryKey: ['product-overview', productId], queryFn: () => productService.getProductOverview(productId) })
  if (query.isLoading) return <LoadingState />
  if (query.isError) return <ErrorState message="Product details could not be loaded. Please try again." />
  const detail = query.data
  if (!detail) return <EmptyState title="Product not found" message="This product may have been removed." />

  const { product, stockSummary } = detail
  const status = stockSummary.available <= 0 ? 'Out of Stock' : stockSummary.available <= product.reorderPoint ? 'Low Stock' : 'In Stock'
  const defaultLocation = detail.stockByLocation.find((row) => row.warehouseId === product.defaultWarehouseId && row.locationId === product.defaultLocationId)

  return (
    <div className="space-y-4">
      <PageHeader title={product.name} description={`${product.sku} · ${detail.category?.name ?? 'Uncategorized'} · ${product.unit}`} />
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={status} />
        <Button variant="secondary" onClick={() => setEditOpen(true)}>Edit Product</Button>
        <Button variant="secondary" onClick={() => navigate(`/receipts/new?productId=${product.id}&warehouseId=${product.defaultWarehouseId}&locationId=${product.defaultLocationId}`)}>New Receipt</Button>
        <Button variant="secondary" onClick={() => navigate(`/deliveries/new?productId=${product.id}&warehouseId=${product.defaultWarehouseId}`)}>New Delivery</Button>
        <Button variant="secondary" onClick={() => navigate(`/transfers/new?productId=${product.id}&warehouseId=${product.defaultWarehouseId}&locationId=${product.defaultLocationId}`)}>Transfer Stock</Button>
        <Button variant="secondary" onClick={() => navigate(`/adjustments/new?productId=${product.id}&warehouseId=${product.defaultWarehouseId}&locationId=${product.defaultLocationId}`)}>Adjust Stock</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="On Hand" value={stockSummary.onHand} />
        <MetricCard title="Reserved" value={stockSummary.reserved} />
        <MetricCard title="Available" value={stockSummary.available} />
        <MetricCard title="Reorder Point" value={product.reorderPoint} />
      </div>
      {defaultLocation ? <p className="text-sm text-slate-400">Default location: {defaultLocation.warehouse?.name} / {defaultLocation.location?.name}</p> : null}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-200">Stock by Warehouse</h2>
        {detail.stockByWarehouse.length ? <DataTable data={detail.stockByWarehouse} columns={[
          { key: 'warehouse', header: 'Warehouse', render: (row) => <Link className="text-sky-300" to={`/warehouses/${row.warehouse.id}`}>{row.warehouse.name}</Link> },
          { key: 'onHand', header: 'On Hand', render: (row) => row.onHand },
          { key: 'reserved', header: 'Reserved', render: (row) => row.reserved },
          { key: 'available', header: 'Available', render: (row) => row.available },
        ]} /> : <EmptyState title="No stock recorded" message="This product has no stock in any warehouse yet." />}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-200">Stock by Location</h2>
        {detail.stockByLocation.length ? <DataTable data={detail.stockByLocation} columns={[
          { key: 'warehouse', header: 'Warehouse', render: (row) => row.warehouse?.name },
          { key: 'location', header: 'Location', render: (row) => row.location ? <Link className="text-sky-300" to={`/locations/${row.location.id}`}>{row.location.name}</Link> : 'Unknown' },
          { key: 'onHand', header: 'On Hand', render: (row) => row.onHand },
          { key: 'reserved', header: 'Reserved', render: (row) => row.reserved },
          { key: 'available', header: 'Available', render: (row) => row.available },
        ]} /> : <EmptyState title="No location stock" message="Stock will appear here after a receipt or initial balance." />}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-200">Reordering Information</h2>
        {detail.reorderingRules.length ? <DataTable data={detail.reorderingRules} columns={[
          { key: 'warehouse', header: 'Warehouse', render: (row) => row.warehouse?.name },
          { key: 'location', header: 'Location', render: (row) => row.location?.name },
          { key: 'minimum', header: 'Minimum', render: (row) => row.minQty },
          { key: 'maximum', header: 'Maximum', render: (row) => row.maxQty },
          { key: 'current', header: 'Available', render: (row) => row.currentQty },
        ]} /> : <EmptyState title="No reordering rule" message="No location-specific replenishment rule is configured for this product." />}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-200">Recent Movements</h2>
        {detail.recentMoves.length ? <DataTable data={detail.recentMoves} columns={[
          { key: 'date', header: 'Date', render: (row) => new Date(row.timestamp).toLocaleString() },
          { key: 'reference', header: 'Reference', render: (row) => row.reference },
          { key: 'operation', header: 'Operation', render: (row) => row.operation },
          { key: 'source', header: 'Source', render: (row) => row.source },
          { key: 'destination', header: 'Destination', render: (row) => row.destination },
          { key: 'quantity', header: 'Quantity', render: (row) => row.quantity > 0 && row.operation !== 'Internal Transfer' ? `+${row.quantity}` : row.quantity },
        ]} /> : <EmptyState title="No movements yet" message="Receipts, deliveries, transfers, and adjustments will be listed here." />}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="space-y-2"><h2 className="text-sm font-semibold text-slate-200">Recent Receipts</h2>
          {detail.receipts.length ? <DataTable data={detail.receipts} columns={[
            { key: 'id', header: 'Receipt', render: (row) => <Link className="text-sky-300" to={`/receipts/${row.receipt.id}`}>{row.receipt.receiptNumber}</Link> },
            { key: 'qty', header: 'Expected / Received', render: (row) => `${row.line.expectedQuantity} / ${row.line.receivedQuantity}` },
            { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.receipt.status} /> },
          ]} /> : <EmptyState title="No receipts" message="No receipts include this product yet." />}
        </section>
        <section className="space-y-2"><h2 className="text-sm font-semibold text-slate-200">Recent Deliveries</h2>
          {detail.deliveries.length ? <DataTable data={detail.deliveries} columns={[
            { key: 'id', header: 'Delivery', render: (row) => <Link className="text-sky-300" to={`/deliveries/${row.delivery.id}`}>{row.delivery.deliveryNumber}</Link> },
            { key: 'qty', header: 'Requested', render: (row) => row.line.requestedQuantity },
            { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.delivery.status} /> },
          ]} /> : <EmptyState title="No deliveries" message="No deliveries include this product yet." />}
        </section>
      </div>
      {editOpen ? <ProductFormDialog product={product} onClose={() => setEditOpen(false)} /> : null}
    </div>
  )
}
