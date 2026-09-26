import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '../../components/ui/button'
import { Dialog } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { useInventoryState } from '../../hooks/useInventoryState'
import { productService, type ProductPayload } from '../../services/productService'
import type { Product } from '../../types/domain'

interface ProductFormDialogProps {
  product?: Product
  onClose: () => void
  onSaved?: () => void
}

type ProductForm = ProductPayload

const emptyForm = (): ProductForm => ({
  name: '', sku: '', categoryId: '', unit: 'pcs', initialStock: 0,
  reorderPoint: 0, defaultWarehouseId: '', defaultLocationId: '',
})

export const ProductFormDialog = ({ product, onClose, onSaved }: ProductFormDialogProps) => {
  const state = useInventoryState()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<ProductForm>(() => product
    ? { ...product, initialStock: 0 }
    : {
        ...emptyForm(),
        categoryId: state.categories[0]?.id ?? '',
        defaultWarehouseId: state.warehouses[0]?.id ?? '',
        defaultLocationId: state.locations.find((location) => location.warehouseId === state.warehouses[0]?.id && location.status === 'active')?.id ?? '',
      })
  const [confirmInitialStock, setConfirmInitialStock] = useState(false)
  const locations = useMemo(
    () => state.locations.filter((location) => location.warehouseId === form.defaultWarehouseId && location.status === 'active'),
    [state.locations, form.defaultWarehouseId],
  )

  const mutation = useMutation({
    mutationFn: () => product
      ? productService.updateProduct(product.id, {
          name: form.name, sku: form.sku, categoryId: form.categoryId, unit: form.unit,
          reorderPoint: form.reorderPoint, defaultWarehouseId: form.defaultWarehouseId,
          defaultLocationId: form.defaultLocationId,
        })
      : productService.createProduct(form),
    onSuccess: () => {
      void queryClient.invalidateQueries()
      toast.success(product ? 'Product updated.' : 'Product created.')
      setConfirmInitialStock(false)
      onSaved?.()
      onClose()
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Unable to save this product.'),
  })

  const changeWarehouse = (warehouseId: string) => {
    const firstLocation = state.locations.find((location) => location.warehouseId === warehouseId && location.status === 'active')
    setForm((current) => ({ ...current, defaultWarehouseId: warehouseId, defaultLocationId: firstLocation?.id ?? '' }))
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!product && form.initialStock > 0) {
      setConfirmInitialStock(true)
      return
    }
    mutation.mutate()
  }

  return (
    <Dialog open title={confirmInitialStock ? 'Confirm Initial Stock' : product ? 'Edit Product' : 'Create Product'} onClose={onClose}>
      {confirmInitialStock ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            {form.initialStock} units of {form.name} will be added to{' '}
            {state.warehouses.find((warehouse) => warehouse.id === form.defaultWarehouseId)?.name} /{' '}
            {state.locations.find((location) => location.id === form.defaultLocationId)?.name}.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmInitialStock(false)}>Back</Button>
            <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Creating…' : 'Confirm and Create'}</Button>
          </div>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-3 md:grid-cols-2">
            <Input aria-label="Product name" placeholder="Name" required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <Input aria-label="SKU / Code" placeholder="SKU / Code" required value={form.sku} onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))} />
            <Select aria-label="Category" required value={form.categoryId} onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}>
              <option value="" disabled>Select category</option>
              {state.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </Select>
            <Input aria-label="Unit of measure" placeholder="Unit of Measure" required value={form.unit} onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))} />
            {!product ? <Input aria-label="Initial stock" type="number" min="0" step="any" placeholder="Initial Stock" required value={form.initialStock} onChange={(event) => setForm((current) => ({ ...current, initialStock: Number(event.target.value) }))} /> : null}
            <Input aria-label="Reorder point" type="number" min="0" step="any" placeholder="Reorder Point" required value={form.reorderPoint} onChange={(event) => setForm((current) => ({ ...current, reorderPoint: Number(event.target.value) }))} />
            <Select aria-label="Default warehouse" required value={form.defaultWarehouseId} onChange={(event) => changeWarehouse(event.target.value)}>
              <option value="" disabled>Select warehouse</option>
              {state.warehouses.filter((warehouse) => warehouse.status === 'active').map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
            </Select>
            <Select aria-label="Default location" required value={form.defaultLocationId} onChange={(event) => setForm((current) => ({ ...current, defaultLocationId: event.target.value }))}>
              <option value="" disabled>Select location</option>
              {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : product ? 'Save Changes' : 'Create Product'}</Button>
          </div>
        </form>
      )}
    </Dialog>
  )
}
