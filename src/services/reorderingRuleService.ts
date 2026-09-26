import { inventoryRepository } from './inventoryRepository'
import type { ReorderingStatus } from '../types/domain'

export const reorderingRuleService = {
  async getRules() {
    const state = inventoryRepository.snapshot()
    return state.reorderingRules.map((rule) => {
      const product = state.products.find((row) => row.id === rule.productId)
      const stock = state.stockItems.find(
        (item) => item.productId === rule.productId && item.warehouseId === rule.warehouseId && item.locationId === rule.locationId,
      )
      const currentQty = stock ? Math.max(stock.onHand - stock.reserved, 0) : 0
      let status: ReorderingStatus = 'Healthy'
      if (currentQty <= rule.minQty / 2) status = 'Critical'
      else if (currentQty <= rule.minQty) status = 'Reorder Required'
      return {
        ...rule,
        product,
        warehouse: state.warehouses.find((row) => row.id === rule.warehouseId),
        location: state.locations.find((row) => row.id === rule.locationId),
        currentQty,
        status,
      }
    })
  },
}
