import { inventoryRepository } from './inventoryRepository'

export const warehouseService = {
  async getWarehouses() {
    const state = inventoryRepository.snapshot()
    return state.warehouses.map((warehouse) => {
      const stock = state.stockItems.filter((item) => item.warehouseId === warehouse.id)
      return {
        ...warehouse,
        totalProducts: new Set(stock.map((item) => item.productId)).size,
        totalUnits: stock.reduce((sum, row) => sum + row.onHand, 0),
      }
    })
  },

  async getWarehouse(id: string) {
    return inventoryRepository.snapshot().warehouses.find((warehouse) => warehouse.id === id) ?? null
  },

  async getWarehouseDetail(id: string) {
    const state = inventoryRepository.snapshot()
    const warehouse = state.warehouses.find((row) => row.id === id)
    if (!warehouse) return null
    const stock = state.stockItems.filter((row) => row.warehouseId === id)
    const locations = state.locations.filter((row) => row.warehouseId === id)
    const recentMoves = state.moveHistory
      .filter((entry) => entry.source.includes(warehouse.name) || entry.destination.includes(warehouse.name))
      .slice(0, 8)
    return {
      warehouse,
      locations,
      stock: stock.map((item) => ({ ...item, product: state.products.find((product) => product.id === item.productId), available: Math.max(item.onHand - item.reserved, 0) })),
      totalProducts: new Set(stock.map((item) => item.productId)).size,
      totalUnits: stock.reduce((sum, item) => sum + item.onHand, 0),
      recentMoves,
    }
  },
}
