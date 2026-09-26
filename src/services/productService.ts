import type { Product } from '../types/domain'
import { inventoryEngine } from './inventoryEngine'
import { inventoryRepository } from './inventoryRepository'
import { createId } from './ids'
import { aggregateProductStock } from '../utils/inventory'

export interface ProductPayload {
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
    return inventoryRepository.snapshot().products
  },

  async getProduct(productId: string) {
    return inventoryRepository.snapshot().products.find((product) => product.id === productId) ?? null
  },

  async getProductStockRows(filters: { warehouseId?: string; locationId?: string } = {}) {
    const state = inventoryRepository.snapshot()
    return state.products.map((product) => {
      const stockItems = state.stockItems.filter((item) => item.productId === product.id
        && (!filters.warehouseId || filters.warehouseId === 'all' || item.warehouseId === filters.warehouseId)
        && (!filters.locationId || filters.locationId === 'all' || item.locationId === filters.locationId))
      const stock = aggregateProductStock(product, stockItems)
      return { product, ...stock, stockStatus: stock.available <= 0 ? 'out' : stock.available <= product.reorderPoint ? 'low' : 'in' }
    })
  },

  async getProductOverview(productId: string) {
    const state = inventoryRepository.snapshot()
    const product = state.products.find((row) => row.id === productId)
    if (!product) return null
    const stockByLocation = state.stockItems.filter((item) => item.productId === productId).map((item) => ({
      ...item,
      warehouse: state.warehouses.find((row) => row.id === item.warehouseId),
      location: state.locations.find((row) => row.id === item.locationId),
      available: Math.max(item.onHand - item.reserved, 0),
    }))
    const stockByWarehouse = state.warehouses.map((warehouse) => {
      const rows = stockByLocation.filter((item) => item.warehouseId === warehouse.id)
      return { warehouse, onHand: rows.reduce((sum, row) => sum + row.onHand, 0), reserved: rows.reduce((sum, row) => sum + row.reserved, 0), available: rows.reduce((sum, row) => sum + row.available, 0) }
    }).filter((row) => row.onHand > 0 || row.reserved > 0)
    return {
      product,
      category: state.categories.find((row) => row.id === product.categoryId),
      stockByLocation,
      stockByWarehouse,
      stockSummary: {
        onHand: stockByLocation.reduce((sum, row) => sum + row.onHand, 0),
        reserved: stockByLocation.reduce((sum, row) => sum + row.reserved, 0),
        available: stockByLocation.reduce((sum, row) => sum + row.available, 0),
      },
      recentMoves: state.moveHistory.filter((row) => row.productId === productId).slice(0, 10),
      receipts: state.receipts.flatMap((receipt) => receipt.lines.filter((line) => line.productId === productId).map((line) => ({ receipt, line }))).slice(0, 8),
      deliveries: state.deliveries.flatMap((delivery) => delivery.lines.filter((line) => line.productId === productId).map((line) => ({ delivery, line }))).slice(0, 8),
      reorderingRules: state.reorderingRules.filter((rule) => rule.productId === productId).map((rule) => {
        const stock = stockByLocation.find((item) => item.locationId === rule.locationId)
        return { ...rule, currentQty: stock?.available ?? 0, location: state.locations.find((row) => row.id === rule.locationId), warehouse: state.warehouses.find((row) => row.id === rule.warehouseId) }
      }),
    }
  },

  async createProduct(payload: ProductPayload) {
    validateProductPayload(payload)
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
    const current = inventoryRepository.snapshot().products.find((product) => product.id === productId)
    if (!current) throw new Error('Product not found.')
    const updated = { ...current, ...payload }
    validateProductFields(updated, inventoryRepository.snapshot().products, productId)
    inventoryRepository.transact((draft) => {
      const index = draft.products.findIndex((product) => product.id === productId)
      if (index >= 0) draft.products[index] = updated
    })
    return this.getProduct(productId)
  },
}

const validateProductFields = (product: Product, products = inventoryRepository.snapshot().products, excludeId?: string) => {
  if (!product.name.trim()) throw new Error('Product name is required.')
  if (!product.sku.trim()) throw new Error('SKU is required.')
  if (!product.unit.trim()) throw new Error('Unit of measure is required.')
  if (!Number.isFinite(product.reorderPoint) || product.reorderPoint < 0) throw new Error('Reorder point must be a valid non-negative quantity.')
  if (products.some((item) => item.id !== excludeId && item.sku.toLowerCase() === product.sku.trim().toLowerCase())) throw new Error('A product with this SKU already exists.')
  const state = inventoryRepository.snapshot()
  if (!state.categories.some((category) => category.id === product.categoryId)) throw new Error('Choose a valid category.')
  const location = state.locations.find((item) => item.id === product.defaultLocationId)
  if (!location || location.warehouseId !== product.defaultWarehouseId || location.status !== 'active') throw new Error('Choose an active location in the selected warehouse.')
}

const validateProductPayload = (payload: ProductPayload) => {
  validateProductFields({
    id: '', name: payload.name, sku: payload.sku, categoryId: payload.categoryId,
    unit: payload.unit, reorderPoint: payload.reorderPoint,
    defaultWarehouseId: payload.defaultWarehouseId, defaultLocationId: payload.defaultLocationId,
  })
  if (!Number.isFinite(payload.initialStock) || payload.initialStock < 0) throw new Error('Initial stock must be a valid non-negative quantity.')
}
