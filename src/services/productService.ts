import { getState, updateState, wait } from './store'
import type { Product } from '../types/domain'
import { inventoryEngine } from './inventoryEngine'
import { inventoryRepository } from './inventoryRepository'
import { createId } from './ids'

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
      id: createId('product'),
      name: payload.name,
      sku: payload.sku,
      categoryId: payload.categoryId,
      unit: payload.unit,
      reorderPoint: payload.reorderPoint,
      defaultWarehouseId: payload.defaultWarehouseId,
      defaultLocationId: payload.defaultLocationId,
    }

    inventoryRepository.transact((draft) => {
      draft.products.unshift(product)
      inventoryEngine.initializeProductStock(draft, product.id, payload.initialStock, 'u1')
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
