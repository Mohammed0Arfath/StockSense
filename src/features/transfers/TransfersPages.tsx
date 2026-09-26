import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DataTable } from '../../components/shared/data-table'
import { EmptyState, ErrorState, LoadingState } from '../../components/shared/states'
import { ConfirmDialog } from '../../components/shared/confirm-dialog'
import { OperationTimeline } from '../../components/shared/operation-timeline'
import { PageHeader } from '../../components/shared/page-header'
import { StatusBadge } from '../../components/shared/status-badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { transferService } from '../../services/transferService'
import { getState } from '../../services/store'
import { operationTimelineSteps } from '../../utils/operationTimeline'

const statusTitle = (status: string) => status[0].toUpperCase() + status.slice(1)

export const TransfersPage = () => {
  const navigate = useNavigate()
  const query = useQuery({ queryKey: ['transfers'], queryFn: () => transferService.getTransfers() })
  const state = getState()
  return (
    <div className="space-y-4">
      <PageHeader title="Internal Transfers" description="Move stock without changing global quantity" actionLabel="New Transfer" onAction={() => navigate('/transfers/new')} />
      {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message="Transfers could not be loaded. Please try again." /> : !query.data?.length ? <EmptyState title="No transfers yet" message="Create an internal transfer to move stock between locations." /> : <DataTable data={query.data} columns={[
        { key: 'number', header: 'Transfer Number', render: (row) => <Link className="text-sky-300" to={`/transfers/${row.id}`}>{row.transferNumber}</Link> },
        { key: 'product', header: 'Product', render: (row) => state.products.find((p) => p.id === row.lines[0]?.productId)?.name },
        { key: 'qty', header: 'Quantity', render: (row) => row.lines.reduce((sum, line) => sum + line.quantity, 0) },
        { key: 'source', header: 'Source', render: (row) => `${state.warehouses.find((w) => w.id === row.sourceWarehouseId)?.name} / ${state.locations.find((l) => l.id === row.sourceLocationId)?.name}` },
        { key: 'destination', header: 'Destination', render: (row) => `${state.warehouses.find((w) => w.id === row.destinationWarehouseId)?.name} / ${state.locations.find((l) => l.id === row.destinationLocationId)?.name}` },
        { key: 'date', header: 'Scheduled Date', render: (row) => new Date(row.scheduledDate).toLocaleDateString() },
        { key: 'status', header: 'Status', render: (row) => <StatusBadge status={statusTitle(row.status)} /> },
      ]} />}
    </div>
  )
}

export const TransferNewPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const state = getState()
  const queryClient = useQueryClient()
  const [form, setForm] = useState(() => ({
    ...(() => {
      const sourceWarehouseId = searchParams.get('warehouseId') ?? state.warehouses.find((row) => row.status === 'active')?.id ?? ''
      const sourceLocationId = searchParams.get('locationId')
      const firstSourceLocation = state.locations.find((location) => location.warehouseId === sourceWarehouseId && location.status === 'active')
      const validSourceLocationId = sourceLocationId && state.locations.some((location) => location.id === sourceLocationId && location.warehouseId === sourceWarehouseId && location.status === 'active')
        ? sourceLocationId
        : firstSourceLocation?.id ?? ''
      const destinationWarehouse = state.warehouses.find((warehouse) => warehouse.id !== sourceWarehouseId && warehouse.status === 'active')
      return {
        sourceWarehouseId,
        sourceLocationId: validSourceLocationId,
        destinationWarehouseId: destinationWarehouse?.id ?? '',
        destinationLocationId: state.locations.find((location) => location.warehouseId === destinationWarehouse?.id && location.status === 'active')?.id ?? '',
      }
    })(),
    scheduledDate: new Date().toISOString().slice(0, 10),
    lines: [{ id: crypto.randomUUID(), productId: searchParams.get('productId') ?? state.products[0]?.id ?? '', quantity: 1 }],
  }))
  const createMutation = useMutation({
    mutationFn: () => transferService.createTransfer({
      transferNumber: `TRF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,
      sourceWarehouseId: form.sourceWarehouseId,
      sourceLocationId: form.sourceLocationId,
      destinationWarehouseId: form.destinationWarehouseId,
      destinationLocationId: form.destinationLocationId,
      scheduledDate: new Date(form.scheduledDate).toISOString(),
      status: 'draft',
      lines: form.lines,
    }),
    onSuccess: (transfer) => {
      queryClient.invalidateQueries()
      navigate(`/transfers/${transfer.id}`)
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Transfer could not be saved.'),
  })
  const availableFor = (productId: string) => state.stockItems.filter((item) => item.productId === productId && item.warehouseId === form.sourceWarehouseId && item.locationId === form.sourceLocationId).reduce((sum, item) => sum + Math.max(item.onHand - item.reserved, 0), 0)

  return (
    <div className="space-y-4">
      <PageHeader title="New Internal Transfer" description="Total stock remains unchanged; only location changes." />
      <Card><CardContent className="grid gap-3 md:grid-cols-2">
        <Select aria-label="Source warehouse" value={form.sourceWarehouseId} onChange={(e) => setForm((s) => ({ ...s, sourceWarehouseId: e.target.value, sourceLocationId: state.locations.find((location) => location.warehouseId === e.target.value && location.status === 'active')?.id ?? '' }))}>{state.warehouses.filter((warehouse) => warehouse.status === 'active').map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select>
        <Select aria-label="Source location" value={form.sourceLocationId} onChange={(e) => setForm((s) => ({ ...s, sourceLocationId: e.target.value }))}>{state.locations.filter((location) => location.warehouseId === form.sourceWarehouseId && location.status === 'active').map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select>
        <Select aria-label="Destination warehouse" value={form.destinationWarehouseId} onChange={(e) => setForm((s) => ({ ...s, destinationWarehouseId: e.target.value, destinationLocationId: state.locations.find((location) => location.warehouseId === e.target.value && location.status === 'active')?.id ?? '' }))}>{state.warehouses.filter((warehouse) => warehouse.status === 'active').map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select>
        <Select aria-label="Destination location" value={form.destinationLocationId} onChange={(e) => setForm((s) => ({ ...s, destinationLocationId: e.target.value }))}>{state.locations.filter((location) => location.warehouseId === form.destinationWarehouseId && location.status === 'active').map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select>
        <Input aria-label="Scheduled date" type="date" required value={form.scheduledDate} onChange={(e) => setForm((s) => ({ ...s, scheduledDate: e.target.value }))} />
      </CardContent></Card>
      <div className="space-y-3">
        {form.lines.map((line, index) => <Card key={line.id}><CardContent className="grid gap-3 md:grid-cols-4">
          <Select aria-label={`Product ${index + 1}`} value={line.productId} onChange={(e) => setForm((s) => ({ ...s, lines: s.lines.map((item) => item.id === line.id ? { ...item, productId: e.target.value } : item) }))}>{state.products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}</Select>
          <Input aria-label="Transfer quantity" type="number" min="0.01" step="any" required value={line.quantity} onChange={(e) => setForm((s) => ({ ...s, lines: s.lines.map((item) => item.id === line.id ? { ...item, quantity: Number(e.target.value) } : item) }))} />
          <p className="self-center text-xs text-slate-400">Available at source: {availableFor(line.productId)}</p>
          <Button type="button" variant="secondary" disabled={form.lines.length === 1} onClick={() => setForm((s) => ({ ...s, lines: s.lines.filter((item) => item.id !== line.id) }))}>Remove line</Button>
        </CardContent></Card>)}
        <Button type="button" variant="secondary" onClick={() => setForm((s) => ({ ...s, lines: [...s.lines, { id: crypto.randomUUID(), productId: state.products[0]?.id ?? '', quantity: 1 }] }))}>Add Product Line</Button>
      </div>
      <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => navigate('/transfers')}>Cancel</Button><Button disabled={createMutation.isPending || !form.lines.length || form.lines.some((line) => !line.productId || line.quantity <= 0) || (form.sourceWarehouseId === form.destinationWarehouseId && form.sourceLocationId === form.destinationLocationId)} onClick={() => createMutation.mutate()}>{createMutation.isPending ? 'Saving…' : 'Save Draft'}</Button></div>
    </div>
  )
}

export const TransferDetailPage = () => {
  const { transferId = '' } = useParams()
  const queryClient = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const query = useQuery({ queryKey: ['transfer', transferId], queryFn: () => transferService.getTransfer(transferId) })
  const transfer = query.data
  const state = getState()
  const advanceMutation = useMutation({
    mutationFn: () => transferService.advanceStatus(transferId),
    onSuccess: () => queryClient.invalidateQueries(),
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Transfer could not be validated.'),
  })
  const cancelMutation = useMutation({
    mutationFn: () => transferService.cancelTransfer(transferId),
    onSuccess: () => { void queryClient.invalidateQueries(); toast.success('Transfer canceled.') },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Transfer could not be canceled.'),
  })
  if (!transfer) return <p className="text-sm text-slate-400">Transfer not found.</p>

  return (
    <div className="space-y-4">
      <PageHeader title={transfer.transferNumber} description="Internal transfer workflow" />
      <OperationTimeline steps={operationTimelineSteps(transfer.status, transfer.statusHistory)} />
      <DataTable data={transfer.lines} columns={[
        { key: 'product', header: 'Product', render: (line) => state.products.find((p) => p.id === line.productId)?.name },
        { key: 'qty', header: 'Quantity', render: (line) => line.quantity },
      ]} />
      <p className="text-xs text-slate-400">This transfer redistributes stock and does not change total global stock.</p>
      <div className="flex gap-2"><Button variant="secondary" disabled={transfer.status === 'ready' || transfer.status === 'done' || transfer.status === 'canceled' || advanceMutation.isPending} onClick={() => advanceMutation.mutate()}>Advance Stage</Button><Button disabled={transfer.status !== 'ready' || advanceMutation.isPending} onClick={() => setConfirmOpen(true)}>Validate Transfer</Button>{transfer.status !== 'done' && transfer.status !== 'canceled' ? <Button variant="destructive" disabled={cancelMutation.isPending} onClick={() => setCancelOpen(true)}>Cancel Transfer</Button> : null}</div>
      <ConfirmDialog
        open={confirmOpen}
        title="Validate Transfer?"
        message={`${transfer.lines.map((line) => `${line.quantity} ${state.products.find((product) => product.id === line.productId)?.unit ?? ''} of ${state.products.find((product) => product.id === line.productId)?.name ?? 'product'}`).join(', ')} will move from ${state.warehouses.find((row) => row.id === transfer.sourceWarehouseId)?.name} / ${state.locations.find((row) => row.id === transfer.sourceLocationId)?.name} to ${state.warehouses.find((row) => row.id === transfer.destinationWarehouseId)?.name} / ${state.locations.find((row) => row.id === transfer.destinationLocationId)?.name}.`}
        confirmLabel="Validate Transfer"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => { setConfirmOpen(false); advanceMutation.mutate() }}
      />
      <ConfirmDialog open={cancelOpen} title="Cancel Transfer?" message="This transfer will be canceled. Inventory will remain unchanged." confirmLabel="Cancel Transfer" onCancel={() => setCancelOpen(false)} onConfirm={() => { setCancelOpen(false); cancelMutation.mutate() }} />
    </div>
  )
}
