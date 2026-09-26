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
import { receiptService } from '../../services/receiptService'
import { getState } from '../../services/store'
import type { Receipt } from '../../types/domain'

const statusTitle = (status: string) => status[0].toUpperCase() + status.slice(1)

export const ReceiptsPage = () => {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [warehouse, setWarehouse] = useState('all')
  const query = useQuery({ queryKey: ['receipts'], queryFn: () => receiptService.getReceipts() })
  const state = getState()

  const filtered = useMemo(
    () =>
      (query.data ?? []).filter((receipt) => {
        const bySearch = receipt.receiptNumber.toLowerCase().includes(search.toLowerCase()) || receipt.vendor.toLowerCase().includes(search.toLowerCase())
        const byStatus = status === 'all' || receipt.status === status
        const byWarehouse = warehouse === 'all' || receipt.warehouseId === warehouse
        return bySearch && byStatus && byWarehouse
      }),
    [query.data, search, status, warehouse],
  )

  return (
    <div className="space-y-4">
      <PageHeader title="Receipts" description="Incoming stock workflow" actionLabel="New Receipt" onAction={() => (window.location.href = '/receipts/new')} />
      <div className="grid gap-2 md:grid-cols-3">
        <SearchBar value={search} onChange={setSearch} />
        <FilterDropdown value={status} onChange={setStatus} options={[{ label: 'All Statuses', value: 'all' }, { label: 'Draft', value: 'draft' }, { label: 'Waiting', value: 'waiting' }, { label: 'Ready', value: 'ready' }, { label: 'Done', value: 'done' }, { label: 'Canceled', value: 'canceled' }]} />
        <FilterDropdown value={warehouse} onChange={setWarehouse} options={[{ label: 'All Warehouses', value: 'all' }, ...state.warehouses.map((w) => ({ label: w.name, value: w.id }))]} />
      </div>
      <DataTable
        data={filtered}
        columns={[
          { key: 'number', header: 'Receipt Number', render: (row) => <Link className="text-sky-300" to={`/receipts/${row.id}`}>{row.receiptNumber}</Link> },
          { key: 'vendor', header: 'Vendor', render: (row) => row.vendor },
          { key: 'warehouse', header: 'Warehouse', render: (row) => state.warehouses.find((w) => w.id === row.warehouseId)?.name },
          { key: 'date', header: 'Scheduled Date', render: (row) => new Date(row.scheduledDate).toLocaleDateString() },
          { key: 'products', header: 'Products', render: (row) => row.lines.length },
          { key: 'qty', header: 'Quantity', render: (row) => row.lines.reduce((sum, line) => sum + line.expectedQuantity, 0) },
          { key: 'status', header: 'Status', render: (row) => <StatusBadge status={statusTitle(row.status)} /> },
          { key: 'creator', header: 'Created By', render: (row) => state.users.find((u) => u.id === row.createdBy)?.name },
        ]}
      />
    </div>
  )
}

export const ReceiptNewPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const state = getState()
  const queryClient = useQueryClient()
  const [form, setForm] = useState(() => {
    const warehouseId = searchParams.get('warehouseId') ?? 'w1'
    const requestedLocation = searchParams.get('locationId')
    const locationId = requestedLocation && state.locations.some((location) => location.id === requestedLocation && location.warehouseId === warehouseId)
      ? requestedLocation
      : state.locations.find((location) => location.warehouseId === warehouseId)?.id ?? ''
    return { vendor: '', warehouseId, reference: '', productId: searchParams.get('productId') ?? 'p1', quantity: 1, locationId }
  })
  const createMutation = useMutation({
    mutationFn: () =>
      receiptService.createReceipt({
        receiptNumber: `REC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,
        vendor: form.vendor || 'Unknown Vendor',
        warehouseId: form.warehouseId,
        scheduledDate: new Date().toISOString(),
        reference: form.reference,
        status: 'draft',
        createdBy: 'u1',
        lines: [{ id: `rl-${Date.now()}`, productId: form.productId, expectedQuantity: form.quantity, receivedQuantity: form.quantity, unit: 'pcs', locationId: form.locationId }],
      }),
    onSuccess: (receipt) => {
      queryClient.invalidateQueries()
      navigate(`/receipts/${receipt.id}`)
    },
  })

  return (
    <div className="space-y-4">
      <PageHeader title="New Receipt" description="Draft → Waiting → Ready → Done" />
      <OperationTimeline steps={[{ label: 'Draft', active: true }, { label: 'Waiting', active: false }, { label: 'Ready', active: false }, { label: 'Done', active: false }]} />
      <Card><CardContent className="grid gap-3 md:grid-cols-2">
        <Input placeholder="Vendor" value={form.vendor} onChange={(e) => setForm((s) => ({ ...s, vendor: e.target.value }))} />
        <Input placeholder="Reference" value={form.reference} onChange={(e) => setForm((s) => ({ ...s, reference: e.target.value }))} />
        <Select value={form.warehouseId} onChange={(e) => setForm((s) => ({ ...s, warehouseId: e.target.value, locationId: state.locations.find((location) => location.warehouseId === e.target.value && location.status === 'active')?.id ?? '' }))}>{state.warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select>
        <Select value={form.locationId} onChange={(e) => setForm((s) => ({ ...s, locationId: e.target.value }))}>{state.locations.filter((location) => location.warehouseId === form.warehouseId && location.status === 'active').map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select>
        <Select value={form.productId} onChange={(e) => setForm((s) => ({ ...s, productId: e.target.value }))}>{state.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
        <Input type="number" value={form.quantity} onChange={(e) => setForm((s) => ({ ...s, quantity: Number(e.target.value) }))} />
      </CardContent></Card>
      <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => navigate('/receipts')}>Cancel</Button><Button onClick={() => createMutation.mutate()}>Save Draft</Button></div>
    </div>
  )
}

export const ReceiptDetailPage = () => {
  const { receiptId = '' } = useParams()
  const queryClient = useQueryClient()
  const state = getState()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const query = useQuery({ queryKey: ['receipt', receiptId], queryFn: () => receiptService.getReceipt(receiptId) })
  const advanceMutation = useMutation({
    mutationFn: () => receiptService.advanceStatus(receiptId),
    onSuccess: () => queryClient.invalidateQueries(),
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Receipt could not be validated.'),
  })
  const receipt = query.data as Receipt | null
  if (!receipt) return <p className="text-sm text-slate-400">Receipt not found.</p>

  const steps = ['draft', 'waiting', 'ready', 'done']
  const currentIndex = steps.indexOf(receipt.status)

  return (
    <div className="space-y-4">
      <PageHeader title={receipt.receiptNumber} description={`${receipt.vendor} · ${new Date(receipt.scheduledDate).toLocaleDateString()}`} />
      <OperationTimeline steps={steps.map((step, idx) => ({ label: statusTitle(step), active: idx <= currentIndex }))} />
      <DataTable data={receipt.lines} columns={[
        { key: 'product', header: 'Product', render: (line) => state.products.find((p) => p.id === line.productId)?.name },
        { key: 'sku', header: 'SKU', render: (line) => state.products.find((p) => p.id === line.productId)?.sku },
        { key: 'expected', header: 'Expected Qty', render: (line) => line.expectedQuantity },
        { key: 'received', header: 'Received Qty', render: (line) => line.receivedQuantity },
        { key: 'unit', header: 'Unit', render: (line) => line.unit },
        { key: 'location', header: 'Location', render: (line) => state.locations.find((l) => l.id === line.locationId)?.name },
      ]} />
      <div className="flex items-center gap-2">
        <StatusBadge status={statusTitle(receipt.status)} />
        <Button variant="secondary" disabled={receipt.status === 'ready' || receipt.status === 'done' || receipt.status === 'canceled' || advanceMutation.isPending} onClick={() => advanceMutation.mutate()}>Advance Stage</Button>
        <Button onClick={() => setConfirmOpen(true)} disabled={receipt.status !== 'ready' || advanceMutation.isPending}>Validate Receipt</Button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Validate Receipt?"
        message={receipt.lines.map((line) => {
          const product = state.products.find((row) => row.id === line.productId)
          const location = state.locations.find((row) => row.id === line.locationId)
          const warehouse = state.warehouses.find((row) => row.id === receipt.warehouseId)
          return `${line.receivedQuantity} ${product?.unit ?? line.unit} of ${product?.name ?? 'product'} will be added to ${warehouse?.name ?? 'warehouse'} / ${location?.name ?? 'location'}.`
        }).join(' ')}
        confirmLabel="Validate Receipt"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false)
          advanceMutation.mutate()
        }}
      />
    </div>
  )
}
