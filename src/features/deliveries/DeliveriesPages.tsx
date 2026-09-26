import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DataTable } from '../../components/shared/data-table'
import { ConfirmDialog } from '../../components/shared/confirm-dialog'
import { FilterDropdown, SearchBar } from '../../components/shared/filters'
import { OperationTimeline } from '../../components/shared/operation-timeline'
import { PageHeader } from '../../components/shared/page-header'
import { StatusBadge } from '../../components/shared/status-badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { deliveryService } from '../../services/deliveryService'
import { getState } from '../../services/store'

const statusTitle = (status: string) => status[0].toUpperCase() + status.slice(1)

export const DeliveriesPage = () => {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const query = useQuery({ queryKey: ['deliveries'], queryFn: () => deliveryService.getDeliveries() })
  const state = getState()
  const filtered = useMemo(
    () =>
      (query.data ?? []).filter((delivery) => {
        const bySearch = delivery.deliveryNumber.toLowerCase().includes(search.toLowerCase()) || delivery.customer.toLowerCase().includes(search.toLowerCase())
        const byStatus = status === 'all' || delivery.status === status
        return bySearch && byStatus
      }),
    [query.data, search, status],
  )

  return (
    <div className="space-y-4">
      <PageHeader title="Deliveries" description="Outgoing stock workflow" actionLabel="New Delivery" onAction={() => (window.location.href = '/deliveries/new')} />
      <div className="grid gap-2 md:grid-cols-2"><SearchBar value={search} onChange={setSearch} /><FilterDropdown value={status} onChange={setStatus} options={[{ label: 'All Statuses', value: 'all' }, { label: 'Draft', value: 'draft' }, { label: 'Waiting', value: 'waiting' }, { label: 'Ready', value: 'ready' }, { label: 'Done', value: 'done' }, { label: 'Canceled', value: 'canceled' }]} /></div>
      <DataTable
        data={filtered}
        columns={[
          { key: 'number', header: 'Delivery Number', render: (row) => <Link className="text-sky-300" to={`/deliveries/${row.id}`}>{row.deliveryNumber}</Link> },
          { key: 'customer', header: 'Customer', render: (row) => row.customer },
          { key: 'warehouse', header: 'Source Warehouse', render: (row) => state.warehouses.find((w) => w.id === row.sourceWarehouseId)?.name },
          { key: 'date', header: 'Scheduled Date', render: (row) => new Date(row.scheduledDate).toLocaleDateString() },
          { key: 'products', header: 'Products', render: (row) => row.lines.length },
          { key: 'qty', header: 'Quantity', render: (row) => row.lines.reduce((sum, line) => sum + line.requestedQuantity, 0) },
          { key: 'status', header: 'Status', render: (row) => <StatusBadge status={statusTitle(row.status)} /> },
        ]}
      />
    </div>
  )
}

export const DeliveryNewPage = () => {
  const state = getState()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [form, setForm] = useState(() => ({
    customer: '', sourceWarehouseId: searchParams.get('warehouseId') ?? 'w1', reference: '',
    productId: searchParams.get('productId') ?? 'p1', quantity: 1,
  }))
  const available = state.stockItems.filter((item) => item.productId === form.productId && item.warehouseId === form.sourceWarehouseId).reduce((sum, row) => sum + Math.max(row.onHand - row.reserved, 0), 0)

  const createMutation = useMutation({
    mutationFn: () =>
      deliveryService.createDelivery({
        deliveryNumber: `DEL-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,
        customer: form.customer || 'Unknown Customer',
        sourceWarehouseId: form.sourceWarehouseId,
        scheduledDate: new Date().toISOString(),
        reference: form.reference,
        status: 'draft',
        createdBy: 'u1',
        lines: [{ id: `dl-${Date.now()}`, productId: form.productId, requestedQuantity: form.quantity, pickedQuantity: 0, packedQuantity: 0 }],
      }),
    onSuccess: (delivery) => {
      queryClient.invalidateQueries()
      navigate(`/deliveries/${delivery.id}`)
    },
  })

  return (
    <div className="space-y-4">
      <PageHeader title="New Delivery" description="Draft → Waiting → Ready → Done" />
      <Card><CardContent className="grid gap-3 md:grid-cols-2">
        <Input placeholder="Customer" value={form.customer} onChange={(e) => setForm((s) => ({ ...s, customer: e.target.value }))} />
        <Input placeholder="Reference" value={form.reference} onChange={(e) => setForm((s) => ({ ...s, reference: e.target.value }))} />
        <Select value={form.sourceWarehouseId} onChange={(e) => setForm((s) => ({ ...s, sourceWarehouseId: e.target.value }))}>{state.warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select>
        <Select value={form.productId} onChange={(e) => setForm((s) => ({ ...s, productId: e.target.value }))}>{state.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
        <Input type="number" value={form.quantity} onChange={(e) => setForm((s) => ({ ...s, quantity: Number(e.target.value) }))} max={available} />
        <p className="text-xs text-slate-400">Available quantity: {available}</p>
      </CardContent></Card>
      <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => navigate('/deliveries')}>Cancel</Button><Button disabled={form.quantity > available} onClick={() => createMutation.mutate()}>Save Draft</Button></div>
    </div>
  )
}

export const DeliveryDetailPage = () => {
  const { deliveryId = '' } = useParams()
  const queryClient = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const state = getState()
  const query = useQuery({ queryKey: ['delivery', deliveryId], queryFn: () => deliveryService.getDelivery(deliveryId) })
  const delivery = query.data
  const canFulfillQuery = useQuery({ queryKey: ['delivery-fulfill', deliveryId], queryFn: () => deliveryService.canFulfillDelivery(deliveryId) })
  const advanceMutation = useMutation({
    mutationFn: () => deliveryService.advanceStatus(deliveryId),
    onSuccess: () => queryClient.invalidateQueries(),
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Delivery could not be validated.'),
  })
  if (!delivery) return <p className="text-sm text-slate-400">Delivery not found.</p>

  const steps = ['draft', 'waiting', 'ready', 'done']
  const currentIndex = steps.indexOf(delivery.status)

  return (
    <div className="space-y-4">
      <PageHeader title={delivery.deliveryNumber} description={`${delivery.customer} · ${new Date(delivery.scheduledDate).toLocaleDateString()}`} />
      <OperationTimeline steps={steps.map((step, idx) => ({ label: statusTitle(step), active: idx <= currentIndex }))} />
      <DataTable data={delivery.lines} columns={[
        { key: 'product', header: 'Product', render: (line) => state.products.find((p) => p.id === line.productId)?.name },
        { key: 'available', header: 'Available Quantity', render: (line) => state.stockItems.filter((item) => item.productId === line.productId && item.warehouseId === delivery.sourceWarehouseId).reduce((sum, item) => sum + Math.max(item.onHand - item.reserved, 0), 0) },
        { key: 'requested', header: 'Requested Quantity', render: (line) => line.requestedQuantity },
        { key: 'picked', header: 'Picked', render: (line) => line.pickedQuantity },
        { key: 'packed', header: 'Packed', render: (line) => line.packedQuantity },
      ]} />
      {!canFulfillQuery.data ? <p className="text-sm text-red-300">Requested quantity exceeds available stock.</p> : null}
      <div className="flex gap-2">
        <StatusBadge status={statusTitle(delivery.status)} />
        <Button variant="secondary" disabled={delivery.status === 'ready' || delivery.status === 'done' || delivery.status === 'canceled' || advanceMutation.isPending} onClick={() => advanceMutation.mutate()}>Pick / Pack / Advance</Button>
        <Button disabled={!canFulfillQuery.data || delivery.status !== 'ready' || advanceMutation.isPending} onClick={() => setConfirmOpen(true)}>Validate Delivery</Button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Validate Delivery?"
        message={delivery.lines.map((line) => {
          const product = state.products.find((row) => row.id === line.productId)
          const warehouse = state.warehouses.find((row) => row.id === delivery.sourceWarehouseId)
          return `${line.requestedQuantity} ${product?.unit ?? ''} of ${product?.name ?? 'product'} will be deducted from ${warehouse?.name ?? 'warehouse'}.`
        }).join(' ')}
        confirmLabel="Validate Delivery"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false)
          advanceMutation.mutate()
        }}
      />
    </div>
  )
}
