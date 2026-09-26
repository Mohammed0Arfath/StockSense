import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DataTable } from '../../components/shared/data-table'
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

const statusTitle = (status: string) => status[0].toUpperCase() + status.slice(1)

export const TransfersPage = () => {
  const query = useQuery({ queryKey: ['transfers'], queryFn: () => transferService.getTransfers() })
  const state = getState()
  return (
    <div className="space-y-4">
      <PageHeader title="Internal Transfers" description="Move stock without changing global quantity" actionLabel="New Transfer" onAction={() => (window.location.href = '/transfers/new')} />
      <DataTable data={query.data ?? []} columns={[
        { key: 'number', header: 'Transfer Number', render: (row) => <Link className="text-sky-300" to={`/transfers/${row.id}`}>{row.transferNumber}</Link> },
        { key: 'product', header: 'Product', render: (row) => state.products.find((p) => p.id === row.lines[0]?.productId)?.name },
        { key: 'qty', header: 'Quantity', render: (row) => row.lines.reduce((sum, line) => sum + line.quantity, 0) },
        { key: 'source', header: 'Source', render: (row) => `${state.warehouses.find((w) => w.id === row.sourceWarehouseId)?.name} / ${state.locations.find((l) => l.id === row.sourceLocationId)?.name}` },
        { key: 'destination', header: 'Destination', render: (row) => `${state.warehouses.find((w) => w.id === row.destinationWarehouseId)?.name} / ${state.locations.find((l) => l.id === row.destinationLocationId)?.name}` },
        { key: 'date', header: 'Scheduled Date', render: (row) => new Date(row.scheduledDate).toLocaleDateString() },
        { key: 'status', header: 'Status', render: (row) => <StatusBadge status={statusTitle(row.status)} /> },
      ]} />
    </div>
  )
}

export const TransferNewPage = () => {
  const navigate = useNavigate()
  const state = getState()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ sourceWarehouseId: 'w1', sourceLocationId: 'l1', destinationWarehouseId: 'w2', destinationLocationId: 'l4', productId: 'p1', quantity: 1 })
  const createMutation = useMutation({
    mutationFn: () => transferService.createTransfer({
      transferNumber: `TRF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,
      sourceWarehouseId: form.sourceWarehouseId,
      sourceLocationId: form.sourceLocationId,
      destinationWarehouseId: form.destinationWarehouseId,
      destinationLocationId: form.destinationLocationId,
      scheduledDate: new Date().toISOString(),
      status: 'draft',
      lines: [{ id: `tl-${Date.now()}`, productId: form.productId, quantity: form.quantity }],
    }),
    onSuccess: (transfer) => {
      queryClient.invalidateQueries()
      navigate(`/transfers/${transfer.id}`)
    },
  })

  return (
    <div className="space-y-4">
      <PageHeader title="New Internal Transfer" description="Total stock remains unchanged; only location changes." />
      <Card><CardContent className="grid gap-3 md:grid-cols-2">
        <Select value={form.sourceWarehouseId} onChange={(e) => setForm((s) => ({ ...s, sourceWarehouseId: e.target.value }))}>{state.warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select>
        <Select value={form.sourceLocationId} onChange={(e) => setForm((s) => ({ ...s, sourceLocationId: e.target.value }))}>{state.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select>
        <Select value={form.destinationWarehouseId} onChange={(e) => setForm((s) => ({ ...s, destinationWarehouseId: e.target.value }))}>{state.warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select>
        <Select value={form.destinationLocationId} onChange={(e) => setForm((s) => ({ ...s, destinationLocationId: e.target.value }))}>{state.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select>
        <Select value={form.productId} onChange={(e) => setForm((s) => ({ ...s, productId: e.target.value }))}>{state.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
        <Input type="number" value={form.quantity} onChange={(e) => setForm((s) => ({ ...s, quantity: Number(e.target.value) }))} />
      </CardContent></Card>
      <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => navigate('/transfers')}>Cancel</Button><Button onClick={() => createMutation.mutate()}>Save Draft</Button></div>
    </div>
  )
}

export const TransferDetailPage = () => {
  const { transferId = '' } = useParams()
  const queryClient = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const query = useQuery({ queryKey: ['transfer', transferId], queryFn: () => transferService.getTransfer(transferId) })
  const transfer = query.data
  const state = getState()
  const advanceMutation = useMutation({ mutationFn: () => transferService.advanceStatus(transferId), onSuccess: () => queryClient.invalidateQueries() })
  if (!transfer) return <p className="text-sm text-slate-400">Transfer not found.</p>

  const steps = ['draft', 'waiting', 'ready', 'done']
  const currentIndex = steps.indexOf(transfer.status)

  return (
    <div className="space-y-4">
      <PageHeader title={transfer.transferNumber} description="Internal transfer workflow" />
      <OperationTimeline steps={steps.map((step, idx) => ({ label: statusTitle(step), active: idx <= currentIndex }))} />
      <DataTable data={transfer.lines} columns={[
        { key: 'product', header: 'Product', render: (line) => state.products.find((p) => p.id === line.productId)?.name },
        { key: 'qty', header: 'Quantity', render: (line) => line.quantity },
      ]} />
      <p className="text-xs text-slate-400">This transfer redistributes stock and does not change total global stock.</p>
      <div className="flex gap-2"><Button variant="secondary" onClick={() => advanceMutation.mutate()}>Advance Stage</Button><Button disabled={transfer.status !== 'ready'} onClick={() => setConfirmOpen(true)}>Validate Transfer</Button></div>
      <ConfirmDialog open={confirmOpen} title="Validate Transfer?" message="Source location will decrease and destination will increase by the transfer quantity." confirmLabel="Validate Transfer" onCancel={() => setConfirmOpen(false)} onConfirm={() => { setConfirmOpen(false); advanceMutation.mutate() }} />
    </div>
  )
}
