import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DataTable } from '../../components/shared/data-table'
import { ConfirmDialog } from '../../components/shared/confirm-dialog'
import { PageHeader } from '../../components/shared/page-header'
import { StatusBadge } from '../../components/shared/status-badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Textarea } from '../../components/ui/textarea'
import { adjustmentService } from '../../services/adjustmentService'
import { getState } from '../../services/store'

export const AdjustmentsPage = () => {
  const query = useQuery({ queryKey: ['adjustments'], queryFn: () => adjustmentService.getAdjustments() })
  const state = getState()
  return (
    <div className="space-y-4">
      <PageHeader title="Stock Adjustments" description="Reconcile system quantities with physical counts" actionLabel="New Adjustment" onAction={() => (window.location.href = '/adjustments/new')} />
      <DataTable data={query.data ?? []} columns={[
        { key: 'id', header: 'Adjustment ID', render: (row) => <Link className="text-sky-300" to={`/adjustments/${row.id}`}>{row.adjustmentNumber}</Link> },
        { key: 'product', header: 'Product', render: (row) => state.products.find((p) => p.id === row.productId)?.name },
        { key: 'location', header: 'Location', render: (row) => state.locations.find((l) => l.id === row.locationId)?.name },
        { key: 'system', header: 'System Qty', render: (row) => row.systemQuantity },
        { key: 'counted', header: 'Counted Qty', render: (row) => row.countedQuantity },
        { key: 'difference', header: 'Difference', render: (row) => row.countedQuantity - row.systemQuantity },
        { key: 'reason', header: 'Reason', render: (row) => row.reason },
        { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status === 'applied' ? 'Applied' : 'Draft'} /> },
      ]} />
    </div>
  )
}

export const AdjustmentNewPage = () => {
  const state = getState()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ productId: 'p1', warehouseId: 'w1', locationId: 'l1', countedQuantity: 0, reason: '' })
  const currentSystemQuantity = state.stockItems.find((s) => s.productId === form.productId && s.warehouseId === form.warehouseId && s.locationId === form.locationId)?.onHand ?? 0
  const difference = form.countedQuantity - currentSystemQuantity

  const createMutation = useMutation({
    mutationFn: () => adjustmentService.createAdjustment({
      productId: form.productId,
      warehouseId: form.warehouseId,
      locationId: form.locationId,
      systemQuantity: currentSystemQuantity,
      countedQuantity: form.countedQuantity,
      reason: form.reason,
      createdBy: 'u1',
      date: new Date().toISOString(),
    }),
    onSuccess: (adjustment) => {
      queryClient.invalidateQueries()
      navigate(`/adjustments/${adjustment.id}`)
    },
  })

  return (
    <div className="space-y-4">
      <PageHeader title="New Adjustment" description="Difference = Counted Quantity - Current System Quantity" />
      <Card><CardContent className="grid gap-3 md:grid-cols-2">
        <Select value={form.productId} onChange={(e) => setForm((s) => ({ ...s, productId: e.target.value }))}>{state.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
        <Select value={form.warehouseId} onChange={(e) => setForm((s) => ({ ...s, warehouseId: e.target.value }))}>{state.warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select>
        <Select value={form.locationId} onChange={(e) => setForm((s) => ({ ...s, locationId: e.target.value }))}>{state.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select>
        <Input disabled value={currentSystemQuantity} />
        <Input type="number" value={form.countedQuantity} onChange={(e) => setForm((s) => ({ ...s, countedQuantity: Number(e.target.value) }))} />
        <div className="text-sm text-slate-300">Difference: {difference} ({difference > 0 ? 'Increase' : difference < 0 ? 'Decrease' : 'No Change'})</div>
        <div className="md:col-span-2"><Textarea placeholder="Reason" value={form.reason} onChange={(e) => setForm((s) => ({ ...s, reason: e.target.value }))} /></div>
      </CardContent></Card>
      <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => navigate('/adjustments')}>Cancel</Button><Button onClick={() => createMutation.mutate()}>Save Draft</Button></div>
    </div>
  )
}

export const AdjustmentDetailPage = () => {
  const { adjustmentId = '' } = useParams()
  const queryClient = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const query = useQuery({ queryKey: ['adjustment', adjustmentId], queryFn: () => adjustmentService.getAdjustment(adjustmentId) })
  const adjustment = query.data
  const applyMutation = useMutation({ mutationFn: () => adjustmentService.applyAdjustment(adjustmentId), onSuccess: () => queryClient.invalidateQueries() })
  if (!adjustment) return <p className="text-sm text-slate-400">Adjustment not found.</p>

  const difference = adjustment.countedQuantity - adjustment.systemQuantity
  return (
    <div className="space-y-4">
      <PageHeader title={adjustment.adjustmentNumber} description={adjustment.reason} />
      <Card><CardContent className="space-y-1 text-sm">
        <p>System Quantity: {adjustment.systemQuantity}</p>
        <p>Counted Quantity: {adjustment.countedQuantity}</p>
        <p>Difference: {difference} ({difference > 0 ? 'Increase' : difference < 0 ? 'Decrease' : 'No Change'})</p>
      </CardContent></Card>
      <div className="flex gap-2"><StatusBadge status={adjustment.status === 'applied' ? 'Applied' : 'Draft'} /><Button disabled={adjustment.status === 'applied'} onClick={() => setConfirmOpen(true)}>Apply Adjustment</Button></div>
      <ConfirmDialog open={confirmOpen} title="Apply Adjustment?" message="This will reconcile system quantity to the counted quantity." confirmLabel="Apply Adjustment" onCancel={() => setConfirmOpen(false)} onConfirm={() => { setConfirmOpen(false); applyMutation.mutate() }} />
    </div>
  )
}
