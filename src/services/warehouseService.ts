import { getState, wait } from './store'

export const warehouseService = {
  async getWarehouses() {
    await wait()
    const state = getState()
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
    await wait(120)
    return getState().warehouses.find((warehouse) => warehouse.id === id) ?? null
  },
}
