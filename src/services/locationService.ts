import { inventoryRepository } from './inventoryRepository'

export const locationService = {
  async getLocations() {
    const state = inventoryRepository.snapshot()
    return state.locations.map((location) => {
      const stock = state.stockItems.filter((item) => item.locationId === location.id)
      return {
        ...location,
        warehouse: state.warehouses.find((row) => row.id === location.warehouseId),
        stockCount: stock.reduce((sum, item) => sum + item.onHand, 0),
      }
    })
  },
  async getLocation(id: string) {
    return inventoryRepository.snapshot().locations.find((location) => location.id === id) ?? null
  },

  async getLocationDetail(id: string) {
    const state = inventoryRepository.snapshot()
    const location = state.locations.find((row) => row.id === id)
    if (!location) return null
    const warehouse = state.warehouses.find((row) => row.id === location.warehouseId)
    const stock = state.stockItems.filter((row) => row.locationId === id)
    const locationLabel = `${warehouse?.name ?? ''} / ${location.name}`
    const recentMoves = state.moveHistory
      .filter((entry) => entry.source.includes(locationLabel) || entry.destination.includes(locationLabel))
      .slice(0, 12)
    return {
      location,
      warehouse,
      stock: stock.map((item) => ({ ...item, product: state.products.find((product) => product.id === item.productId), available: Math.max(item.onHand - item.reserved, 0) })),
      recentMoves,
    }
  },
}
