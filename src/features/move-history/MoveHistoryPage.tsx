import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '../../components/shared/data-table'
import { EmptyState, ErrorState, LoadingState } from '../../components/shared/states'
import { FilterDropdown, SearchBar } from '../../components/shared/filters'
import { PageHeader } from '../../components/shared/page-header'
import { StatusBadge } from '../../components/shared/status-badge'
import { Input } from '../../components/ui/input'
import { useInventoryState } from '../../hooks/useInventoryState'
import { ledgerService } from '../../services/ledgerService'
import { Card, CardContent } from '../../components/ui/card'

export const MoveHistoryDetailPage = () => {
  const { entryId = '' } = useParams()
  const query = useQuery({ queryKey: ['ledger-entry', entryId], queryFn: () => ledgerService.getEntryDetail(entryId) })
  if (query.isLoading) return <LoadingState />
  if (query.isError) return <ErrorState message="Movement details could not be loaded." />
  const detail = query.data
  if (!detail) return <EmptyState title="Movement not found" message="This ledger entry may have been removed." />
  const { entry, product, sourceWarehouse, sourceLocation, destinationWarehouse, destinationLocation, document } = detail
  return <div className="space-y-4">
    <PageHeader title={entry.reference} description={`${entry.operation} · ${new Date(entry.timestamp).toLocaleString()}`} />
    <Card><CardContent className="grid gap-3 pt-5 sm:grid-cols-2">
      <p>Product: {product?.name ?? 'Unknown product'} ({entry.sku})</p><p>Quantity: {entry.quantity}</p>
      <p>Source: {[sourceWarehouse?.name, sourceLocation?.name].filter(Boolean).join(' / ') || entry.source}</p>
      <p>Destination: {[destinationWarehouse?.name, destinationLocation?.name].filter(Boolean).join(' / ') || entry.destination}</p>
      <p>User: {entry.user}</p><p>Status: {entry.status}</p>
    </CardContent></Card>
    {document ? <Link className="text-sky-300" to={document.href}>Open {document.label}</Link> : null}
  </div>
}

export const MoveHistoryPage = () => {
  const state = useInventoryState()
  const [search, setSearch] = useState('')
  const [operation, setOperation] = useState('all')
  const [productId, setProductId] = useState('all')
  const [sku, setSku] = useState('all')
  const [warehouseId, setWarehouseId] = useState('all')
  const [locationId, setLocationId] = useState('all')
  const [user, setUser] = useState('all')
  const [status, setStatus] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [sort, setSort] = useState('newest')
  const query = useQuery({ queryKey: ['ledger'], queryFn: () => ledgerService.getEntries() })

  const entries = useMemo(() => {
    const filtered = (query.data ?? []).filter((entry) => {
      const searchText = `${entry.reference} ${entry.sku} ${entry.user} ${entry.source} ${entry.destination} ${entry.product?.name ?? ''}`.toLowerCase()
      const date = entry.timestamp.slice(0, 10)
      return (!search.trim() || searchText.includes(search.trim().toLowerCase()))
        && (operation === 'all' || entry.operation === operation)
        && (productId === 'all' || entry.productId === productId)
        && (sku === 'all' || entry.sku === sku)
        && (warehouseId === 'all' || entry.sourceWarehouseId === warehouseId || entry.destinationWarehouseId === warehouseId)
        && (locationId === 'all' || entry.sourceLocationId === locationId || entry.destinationLocationId === locationId)
        && (user === 'all' || entry.user === user)
        && (status === 'all' || entry.status === status)
        && (!fromDate || date >= fromDate)
        && (!toDate || date <= toDate)
    })
    return filtered.sort((left, right) => {
      if (sort === 'oldest') return left.timestamp.localeCompare(right.timestamp)
      if (sort === 'reference') return left.reference.localeCompare(right.reference)
      if (sort === 'quantity') return Math.abs(right.quantity) - Math.abs(left.quantity)
      return right.timestamp.localeCompare(left.timestamp)
    })
  }, [query.data, search, operation, productId, sku, warehouseId, locationId, user, status, fromDate, toDate, sort])

  const statuses = [...new Set((query.data ?? []).map((entry) => entry.status))]
  const users = [...new Set((query.data ?? []).map((entry) => entry.user))]

  return (
    <div className="space-y-4">
      <PageHeader title="Move History" description="Trace every successful inventory movement to its source document" />
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Search reference, product, SKU, user…" />
        <FilterDropdown value={operation} onChange={setOperation} options={[{ label: 'All Operations', value: 'all' }, ...['Receipt', 'Delivery', 'Internal Transfer', 'Adjustment'].map((value) => ({ label: value, value }))]} />
        <FilterDropdown value={productId} onChange={setProductId} options={[{ label: 'All Products', value: 'all' }, ...state.products.map((product) => ({ label: product.name, value: product.id }))]} />
        <FilterDropdown value={sku} onChange={setSku} options={[{ label: 'All SKUs', value: 'all' }, ...[...new Set((query.data ?? []).map((entry) => entry.sku))].map((value) => ({ label: value, value }))]} />
        <FilterDropdown value={warehouseId} onChange={(value) => { setWarehouseId(value); setLocationId('all') }} options={[{ label: 'All Warehouses', value: 'all' }, ...state.warehouses.map((warehouse) => ({ label: warehouse.name, value: warehouse.id }))]} />
        <FilterDropdown value={locationId} onChange={setLocationId} options={[{ label: 'All Locations', value: 'all' }, ...state.locations.filter((location) => warehouseId === 'all' || location.warehouseId === warehouseId).map((location) => ({ label: location.name, value: location.id }))]} />
        <FilterDropdown value={user} onChange={setUser} options={[{ label: 'All Users', value: 'all' }, ...users.map((value) => ({ label: value, value }))]} />
        <FilterDropdown value={status} onChange={setStatus} options={[{ label: 'All Statuses', value: 'all' }, ...statuses.map((value) => ({ label: value, value }))]} />
        <label className="grid gap-1 text-xs text-slate-400">From<Input aria-label="From date" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
        <label className="grid gap-1 text-xs text-slate-400">To<Input aria-label="To date" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
        <FilterDropdown value={sort} onChange={setSort} options={[{ label: 'Newest first', value: 'newest' }, { label: 'Oldest first', value: 'oldest' }, { label: 'Reference', value: 'reference' }, { label: 'Largest quantity', value: 'quantity' }]} />
      </div>
      {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message="Move history could not be loaded. Please try again." /> : entries.length === 0 ? (
        <EmptyState title={(query.data ?? []).length ? 'No matching movements' : 'No stock movements yet'} message={(query.data ?? []).length ? 'Adjust the filters to find a ledger entry.' : 'Validated receipts, deliveries, transfers, and adjustments will appear here.'} />
      ) : <DataTable data={entries} columns={[
        { key: 'time', header: 'Date / Time', render: (row) => new Date(row.timestamp).toLocaleString() },
        { key: 'reference', header: 'Reference', render: (row) => <Link className="text-sky-300" to={`/move-history/${row.id}`}>{row.reference}</Link> },
        { key: 'operation', header: 'Operation', render: (row) => row.operation },
        { key: 'product', header: 'Product', render: (row) => row.product?.name ?? 'Unknown product' },
        { key: 'sku', header: 'SKU', render: (row) => row.sku },
        { key: 'source', header: 'Source', render: (row) => row.source },
        { key: 'destination', header: 'Destination', render: (row) => row.destination },
        { key: 'quantity', header: 'Quantity', render: (row) => row.quantity },
        { key: 'user', header: 'User', render: (row) => row.user },
        { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
      ]} />}
    </div>
  )
}
