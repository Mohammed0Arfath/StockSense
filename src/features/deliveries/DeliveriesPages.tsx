import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DataTable } from '../../components/shared/data-table'
import { EmptyState, ErrorState, LoadingState } from '../../components/shared/states'
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
import { operationTimelineSteps } from '../../utils/operationTimeline'

const statusTitle = (status: string) => status[0].toUpperCase() + status.slice(1)

export const DeliveriesPage = () => {
  const navigate = useNavigate()
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
      <PageHeader title="Deliveries" description="Outgoing stock workflow" actionLabel="New Delivery" onAction={() => navigate('/deliveries/new')} />
      <div className="grid gap-2 md:grid-cols-2"><SearchBar value={search} onChange={setSearch} /><FilterDropdown value={status} onChange={setStatus} options={[{ label: 'All Statuses', value: 'all' }, { label: 'Draft', value: 'draft' }, { label: 'Waiting', value: 'waiting' }, { label: 'Ready', value: 'ready' }, { label: 'Done', value: 'done' }, { label: 'Canceled', value: 'canceled' }]} /></div>
      {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message="Deliveries could not be loaded. Please try again." /> : filtered.length === 0 ? <EmptyState title={query.data?.length ? 'No matching deliveries' : 'No deliveries yet'} message="Create a delivery to record outgoing stock." /> : <DataTable
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
      />}
    </div>
  )
}

export const DeliveryNewPage = () => {
  const state = getState()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [form, setForm] = useState(() => {
    const sourceWarehouseId = searchParams.get('warehouseId') ?? state.warehouses.find((row) => row.status === 'active')?.id ?? ''
    const requestedLocation = searchParams.get('locationId')
    const sourceLocationId = requestedLocation && state.locations.some((location) => location.id === requestedLocation && location.warehouseId === sourceWarehouseId)
      ? requestedLocation
      : state.locations.find((location) => location.warehouseId === sourceWarehouseId && location.status === 'active')?.id ?? ''
    return {
      customer: '', sourceWarehouseId, sourceLocationId, reference: '', scheduledDate: new Date().toISOString().slice(0, 10),
      lines: [{ id: crypto.randomUUID(), productId: searchParams.get('productId') ?? state.products[0]?.id ?? '', requestedQuantity: 1 }],
    }
  })
  const availableFor = (productId: string) => state.stockItems.filter((item) => item.productId === productId && item.warehouseId === form.sourceWarehouseId && item.locationId === form.sourceLocationId).reduce((sum, row) => sum + Math.max(row.onHand - row.reserved, 0), 0)

  const createMutation = useMutation({
    mutationFn: () =>
      deliveryService.createDelivery({
        deliveryNumber: `DEL-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,
        customer: form.customer,
        sourceWarehouseId: form.sourceWarehouseId,
        scheduledDate: new Date(form.scheduledDate).toISOString(),
        reference: form.reference,
        status: 'draft',
        createdBy: 'u1',
        sourceLocationId: form.sourceLocationId,
        lines: form.lines.map((line) => ({ ...line, pickedQuantity: 0, packedQuantity: 0 })),
      }),
    onSuccess: (delivery) => {
      queryClient.invalidateQueries()
      navigate(`/deliveries/${delivery.id}`)
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Delivery could not be saved.'),
  })

  return (
    <div className="space-y-4">
      <PageHeader title="New Delivery" description="Draft → Waiting → Ready → Done" />
      <Card><CardContent className="grid gap-3 md:grid-cols-2">
        <Input placeholder="Customer" required value={form.customer} onChange={(e) => setForm((s) => ({ ...s, customer: e.target.value }))} />
        <Input placeholder="Reference" value={form.reference} onChange={(e) => setForm((s) => ({ ...s, reference: e.target.value }))} />
        <Input aria-label="Scheduled date" type="date" required value={form.scheduledDate} onChange={(e) => setForm((s) => ({ ...s, scheduledDate: e.target.value }))} />
        <Select aria-label="Source warehouse" value={form.sourceWarehouseId} onChange={(e) => setForm((s) => ({ ...s, sourceWarehouseId: e.target.value, sourceLocationId: state.locations.find((location) => location.warehouseId === e.target.value && location.status === 'active')?.id ?? '' }))}>{state.warehouses.filter((warehouse) => warehouse.status === 'active').map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select>
        <Select aria-label="Source location" value={form.sourceLocationId} onChange={(e) => setForm((s) => ({ ...s, sourceLocationId: e.target.value }))}>{state.locations.filter((location) => location.warehouseId === form.sourceWarehouseId && location.status === 'active').map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select>
      </CardContent></Card>
      <div className="space-y-3">
        {form.lines.map((line, index) => <Card key={line.id}><CardContent className="grid gap-3 md:grid-cols-4">
          <Select aria-label={`Product ${index + 1}`} value={line.productId} onChange={(e) => setForm((s) => ({ ...s, lines: s.lines.map((item) => item.id === line.id ? { ...item, productId: e.target.value } : item) }))}>{state.products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}</Select>
          <Input aria-label="Requested quantity" type="number" min="0.01" step="any" required value={line.requestedQuantity} onChange={(e) => setForm((s) => ({ ...s, lines: s.lines.map((item) => item.id === line.id ? { ...item, requestedQuantity: Number(e.target.value) } : item) }))} />
          <p className="self-center text-xs text-slate-400">Available at location: {availableFor(line.productId)}</p>
          <Button type="button" variant="secondary" disabled={form.lines.length === 1} onClick={() => setForm((s) => ({ ...s, lines: s.lines.filter((item) => item.id !== line.id) }))}>Remove line</Button>
        </CardContent></Card>)}
        <Button type="button" variant="secondary" onClick={() => setForm((s) => ({ ...s, lines: [...s.lines, { id: crypto.randomUUID(), productId: state.products[0]?.id ?? '', requestedQuantity: 1 }] }))}>Add Product Line</Button>
      </div>
      <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => navigate('/deliveries')}>Cancel</Button><Button disabled={createMutation.isPending || !form.customer.trim() || !form.lines.length || form.lines.some((line) => !line.productId || line.requestedQuantity <= 0)} onClick={() => createMutation.mutate()}>{createMutation.isPending ? 'Saving…' : 'Save Draft'}</Button></div>
    </div>
  )
}

export const DeliveryDetailPage = () => {
  const { deliveryId = '' } = useParams()
  const queryClient = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const state = getState()
  const query = useQuery({ queryKey: ['delivery', deliveryId], queryFn: () => deliveryService.getDelivery(deliveryId) })
  const delivery = query.data
  const canFulfillQuery = useQuery({ queryKey: ['delivery-fulfill', deliveryId], queryFn: () => deliveryService.canFulfillDelivery(deliveryId) })
  const pickMutation = useMutation({
    mutationFn: () => deliveryService.pickDelivery(deliveryId),
    onSuccess: () => queryClient.invalidateQueries(),
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Delivery could not be picked.'),
  })
  const packMutation = useMutation({
    mutationFn: () => deliveryService.packDelivery(deliveryId),
    onSuccess: () => queryClient.invalidateQueries(),
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Delivery could not be packed.'),
  })
  const validateMutation = useMutation({
    mutationFn: () => deliveryService.advanceStatus(deliveryId),
    onSuccess: () => { void queryClient.invalidateQueries(); toast.success('Delivery validated.') },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Delivery could not be validated.'),
  })
  const cancelMutation = useMutation({
    mutationFn: () => deliveryService.cancelDelivery(deliveryId),
    onSuccess: () => { void queryClient.invalidateQueries(); toast.success('Delivery canceled.') },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Delivery could not be canceled.'),
  })
  if (!delivery) return <p className="text-sm text-slate-400">Delivery not found.</p>

  const steps = operationTimelineSteps(delivery.status, delivery.statusHistory)

  return (
    <div className="space-y-4">
      <PageHeader title={delivery.deliveryNumber} description={`${delivery.customer} · ${new Date(delivery.scheduledDate).toLocaleDateString()}`} />
      <OperationTimeline steps={steps} />
      <p className="text-sm text-slate-400">Source: {state.warehouses.find((row) => row.id === delivery.sourceWarehouseId)?.name} / {state.locations.find((row) => row.id === delivery.sourceLocationId)?.name}</p>
      <DataTable data={delivery.lines} columns={[
        { key: 'product', header: 'Product', render: (line) => state.products.find((p) => p.id === line.productId)?.name },
        { key: 'available', header: 'Available Quantity', render: (line) => state.stockItems.filter((item) => item.productId === line.productId && item.warehouseId === delivery.sourceWarehouseId && item.locationId === delivery.sourceLocationId).reduce((sum, item) => sum + Math.max(item.onHand - item.reserved, 0), 0) },
        { key: 'requested', header: 'Requested Quantity', render: (line) => line.requestedQuantity },
        { key: 'picked', header: 'Picked', render: (line) => line.pickedQuantity },
        { key: 'packed', header: 'Packed', render: (line) => line.packedQuantity },
      ]} />
      {delivery.status !== 'done' && delivery.status !== 'canceled' && !canFulfillQuery.data ? <p className="text-sm text-red-300">Requested quantities exceed available stock in the source location.</p> : null}
      <div className="flex gap-2">
        <StatusBadge status={statusTitle(delivery.status)} />
        {delivery.status === 'draft' ? <Button variant="secondary" disabled={!canFulfillQuery.data || pickMutation.isPending} onClick={() => pickMutation.mutate()}>Pick Items</Button> : null}
        {delivery.status === 'waiting' ? <Button variant="secondary" disabled={packMutation.isPending} onClick={() => packMutation.mutate()}>Pack Items</Button> : null}
        <Button disabled={!canFulfillQuery.data || delivery.status !== 'ready' || validateMutation.isPending} onClick={() => setConfirmOpen(true)}>Validate Delivery</Button>
        {delivery.status !== 'done' && delivery.status !== 'canceled' ? <Button variant="destructive" disabled={cancelMutation.isPending} onClick={() => setCancelOpen(true)}>Cancel Delivery</Button> : null}
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Validate Delivery?"
        message={delivery.lines.map((line) => {
          const product = state.products.find((row) => row.id === line.productId)
          const warehouse = state.warehouses.find((row) => row.id === delivery.sourceWarehouseId)
          const location = state.locations.find((row) => row.id === delivery.sourceLocationId)
          return `${line.requestedQuantity} ${product?.unit ?? ''} of ${product?.name ?? 'product'} will be deducted from ${warehouse?.name ?? 'warehouse'} / ${location?.name ?? 'location'}.`
        }).join(' ')}
        confirmLabel="Validate Delivery"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false)
          validateMutation.mutate()
        }}
      />
      <ConfirmDialog open={cancelOpen} title="Cancel Delivery?" message="This delivery will be canceled. No stock will be delivered." confirmLabel="Cancel Delivery" onCancel={() => setCancelOpen(false)} onConfirm={() => { setCancelOpen(false); cancelMutation.mutate() }} />
    </div>
  )
}
