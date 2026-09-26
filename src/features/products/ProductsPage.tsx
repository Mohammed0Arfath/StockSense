import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DataTable } from '../../components/shared/data-table'
import { FilterDropdown, SearchBar } from '../../components/shared/filters'
import { PageHeader } from '../../components/shared/page-header'
import { StockStatusIndicator } from '../../components/shared/stock-status-indicator'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Dialog } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { productService } from '../../services/productService'
import { getState } from '../../services/store'
import { aggregateProductStock } from '../../utils/inventory'

export const ProductsPage = () => {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    sku: '',
    categoryId: 'c1',
    unit: 'pcs',
    initialStock: 0,
    reorderPoint: 10,
    defaultWarehouseId: 'w1',
    defaultLocationId: 'l1',
  })

  const queryClient = useQueryClient()
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: () => productService.getProducts() })
  const createMutation = useMutation({
    mutationFn: () => productService.createProduct(form),
    onSuccess: () => {
      setOpen(false)
      queryClient.invalidateQueries()
    },
  })

  const state = getState()
  const rows = useMemo(() => {
    return (productsQuery.data ?? []).map((product) => {
      const stock = aggregateProductStock(product, state.stockItems)
      const categoryName = state.categories.find((item) => item.id === product.categoryId)?.name ?? '-'
      const stockStatus = stock.available <= 0 ? 'out' : stock.available <= product.reorderPoint ? 'low' : 'in'
      return { product, categoryName, ...stock, stockStatus }
    })
  }, [productsQuery.data, state.categories, state.stockItems])

  const filtered = rows.filter((row) => {
    const matchesSearch = row.product.name.toLowerCase().includes(search.toLowerCase()) || row.product.sku.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = category === 'all' || row.product.categoryId === category
    const matchesStatus = status === 'all' || row.stockStatus === status
    return matchesSearch && matchesCategory && matchesStatus
  })

  return (
    <div className="space-y-4">
      <PageHeader title="Products" description="Track product master data and stock status" actionLabel="New Product" onAction={() => setOpen(true)} />
      <div className="grid gap-2 md:grid-cols-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search SKU or product" />
        <FilterDropdown value={category} onChange={setCategory} options={[{ label: 'All Categories', value: 'all' }, ...state.categories.map((c) => ({ label: c.name, value: c.id }))]} />
        <FilterDropdown value={status} onChange={setStatus} options={[{ label: 'All Status', value: 'all' }, { label: 'In Stock', value: 'in' }, { label: 'Low Stock', value: 'low' }, { label: 'Out of Stock', value: 'out' }]} />
      </div>

      <DataTable
        data={filtered}
        columns={[
          { key: 'sku', header: 'SKU', render: (row) => row.product.sku },
          { key: 'product', header: 'Product', render: (row) => row.product.name },
          { key: 'category', header: 'Category', render: (row) => row.categoryName },
          { key: 'unit', header: 'Unit', render: (row) => row.product.unit },
          { key: 'onhand', header: 'On Hand', render: (row) => row.onHand },
          { key: 'reserved', header: 'Reserved', render: (row) => row.reserved },
          { key: 'available', header: 'Available', render: (row) => row.available },
          { key: 'reorder', header: 'Reorder Point', render: (row) => row.product.reorderPoint },
          { key: 'status', header: 'Status', render: (row) => <StockStatusIndicator available={row.available} reorderPoint={row.product.reorderPoint} /> },
          { key: 'actions', header: 'Actions', render: (row) => <Link className="text-sky-300" to={`/products/${row.product.id}`}>View</Link> },
        ]}
      />

      <Dialog open={open} title="Create Product" onClose={() => setOpen(false)}>
        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          <Input placeholder="SKU" value={form.sku} onChange={(e) => setForm((s) => ({ ...s, sku: e.target.value }))} />
          <Select value={form.categoryId} onChange={(e) => setForm((s) => ({ ...s, categoryId: e.target.value }))}>{state.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          <Input placeholder="Unit" value={form.unit} onChange={(e) => setForm((s) => ({ ...s, unit: e.target.value }))} />
          <Input type="number" placeholder="Initial Stock" value={form.initialStock} onChange={(e) => setForm((s) => ({ ...s, initialStock: Number(e.target.value) }))} />
          <Input type="number" placeholder="Reorder Point" value={form.reorderPoint} onChange={(e) => setForm((s) => ({ ...s, reorderPoint: Number(e.target.value) }))} />
        </div>
        <Card className="mt-4"><CardContent className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => createMutation.mutate()}>Create</Button></CardContent></Card>
      </Dialog>
    </div>
  )
}
