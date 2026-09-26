import { getState, updateState, wait } from './store'
import type { Product } from '../types/domain'

interface ProductPayload {
  name: string
  sku: string
  categoryId: string
  unit: string
  initialStock: number
  reorderPoint: number
  defaultWarehouseId: string
  defaultLocationId: string
}

export const productService = {
  async getProducts() {
    await wait()
    return getState().products
  },

  async getProduct(productId: string) {
    await wait(120)
    return getState().products.find((product) => product.id === productId) ?? null
  },

  async createProduct(payload: ProductPayload) {
    await wait()
    const product: Product = {
      id: `p${Date.now()}`,
      name: payload.name,
      sku: payload.sku,
      categoryId: payload.categoryId,
      unit: payload.unit,
      reorderPoint: payload.reorderPoint,
      defaultWarehouseId: payload.defaultWarehouseId,
      defaultLocationId: payload.defaultLocationId,
    }

    updateState((draft) => {
      draft.products.unshift(product)
      draft.stockItems.push({
        id: `s${Date.now()}`,
        productId: product.id,
        warehouseId: payload.defaultWarehouseId,
        locationId: payload.defaultLocationId,
        onHand: payload.initialStock,
        reserved: 0,
      })
      draft.moveHistory.unshift({
        id: `m${Date.now()}`,
        timestamp: new Date().toISOString(),
        reference: product.sku,
        operation: 'Adjustment',
        productId: product.id,
        sku: product.sku,
        source: 'System',
        destination: 'Initial Stock',
        quantity: payload.initialStock,
        user: 'Aisha Khan',
        status: 'Applied',
      })
    })
    return product
  },

  async updateProduct(productId: string, payload: Partial<Product>) {
    await wait()
    updateState((draft) => {
      const index = draft.products.findIndex((product) => product.id === productId)
      if (index >= 0) {
        draft.products[index] = { ...draft.products[index], ...payload }
      }
    })
    return this.getProduct(productId)
  },
}
