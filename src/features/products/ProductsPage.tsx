import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '../../components/shared/data-table'
import { EmptyState, ErrorState, LoadingState } from '../../components/shared/states'
import { FilterDropdown, SearchBar } from '../../components/shared/filters'
import { PageHeader } from '../../components/shared/page-header'
import { StockStatusIndicator } from '../../components/shared/stock-status-indicator'
import { Button } from '../../components/ui/button'
import { ProductFormDialog } from './ProductFormDialog'
import { useInventoryState } from '../../hooks/useInventoryState'
import { productService } from '../../services/productService'

export const ProductsPage = () => {
  const state = useInventoryState()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [warehouse, setWarehouse] = useState('all')
  const [location, setLocation] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('name')
  const [open, setOpen] = useState(false)
  const productsQuery = useQuery({
    queryKey: ['products-stock-rows', warehouse, location],
    queryFn: () => productService.getProductStockRows({ warehouseId: warehouse, locationId: location }),
  })

  const rows = useMemo(() => (productsQuery.data ?? []).map((row) => ({
    ...row,
    categoryName: state.categories.find((item) => item.id === row.product.categoryId)?.name ?? 'Uncategorized',
  })).filter((row) => {
    const query = search.trim().toLowerCase()
    const matchesSearch = !query || row.product.name.toLowerCase().includes(query) || row.product.sku.toLowerCase().includes(query)
    return matchesSearch && (category === 'all' || row.product.categoryId === category) && (status === 'all' || row.stockStatus === status)
  }).sort((left, right) => {
    if (sort === 'sku') return left.product.sku.localeCompare(right.product.sku)
    if (sort === 'available') return right.available - left.available
    if (sort === 'available-asc') return left.available - right.available
    return left.product.name.localeCompare(right.product.name)
  }), [productsQuery.data, state.categories, search, category, status, sort])

  return (
    <div className="space-y-4">
      <PageHeader title="Products" description="Track product master data and stock status" />
      <div className="flex justify-end"><Button onClick={() => setOpen(true)}>New Product</Button></div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
        <SearchBar value={search} onChange={setSearch} placeholder="Search SKU or product" />
        <FilterDropdown value={category} onChange={setCategory} options={[{ label: 'All Categories', value: 'all' }, ...state.categories.map((item) => ({ label: item.name, value: item.id }))]} />
        <FilterDropdown value={warehouse} onChange={(value) => { setWarehouse(value); setLocation('all') }} options={[{ label: 'All Warehouses', value: 'all' }, ...state.warehouses.map((item) => ({ label: item.name, value: item.id }))]} />
        <FilterDropdown value={location} onChange={setLocation} options={[{ label: 'All Locations', value: 'all' }, ...state.locations.filter((item) => warehouse === 'all' || item.warehouseId === warehouse).map((item) => ({ label: item.name, value: item.id }))]} />
        <FilterDropdown value={status} onChange={setStatus} options={[{ label: 'All Stock Status', value: 'all' }, { label: 'In Stock', value: 'in' }, { label: 'Low Stock', value: 'low' }, { label: 'Out of Stock', value: 'out' }]} />
        <FilterDropdown value={sort} onChange={setSort} options={[{ label: 'Sort: Name', value: 'name' }, { label: 'Sort: SKU', value: 'sku' }, { label: 'Most Available', value: 'available' }, { label: 'Least Available', value: 'available-asc' }]} />
      </div>

      {productsQuery.isLoading ? <LoadingState /> : productsQuery.isError ? <ErrorState message="Products could not be loaded. Please try again." /> : rows.length === 0 ? (
        <EmptyState title={productsQuery.data?.length ? 'No matching products' : 'No products yet'} message={productsQuery.data?.length ? 'Adjust your search or filters.' : 'Create a product to start tracking inventory.'} />
      ) : (
        <DataTable data={rows} columns={[
          { key: 'sku', header: 'SKU', render: (row) => row.product.sku },
          { key: 'product', header: 'Product', render: (row) => <Link className="text-sky-300 hover:text-sky-200" to={`/products/${row.product.id}`}>{row.product.name}</Link> },
          { key: 'category', header: 'Category', render: (row) => row.categoryName },
          { key: 'unit', header: 'Unit', render: (row) => row.product.unit },
          { key: 'onhand', header: 'On Hand', render: (row) => row.onHand },
          { key: 'reserved', header: 'Reserved', render: (row) => row.reserved },
          { key: 'available', header: 'Available', render: (row) => row.available },
          { key: 'reorder', header: 'Reorder Point', render: (row) => row.product.reorderPoint },
          { key: 'status', header: 'Status', render: (row) => <StockStatusIndicator available={row.available} reorderPoint={row.product.reorderPoint} /> },
          { key: 'actions', header: 'Actions', render: (row) => <Link className="text-sky-300" to={`/products/${row.product.id}`}>View</Link> },
        ]} />
      )}
      {open ? <ProductFormDialog onClose={() => setOpen(false)} /> : null}
    </div>
  )
}
