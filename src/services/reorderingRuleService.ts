import { getState, wait } from './store'

export const reorderingRuleService = {
  async getRules() {
    await wait()
    const state = getState()
    return state.reorderingRules.map((rule) => {
      const stock = state.stockItems.find(
        (item) => item.productId === rule.productId && item.warehouseId === rule.warehouseId && item.locationId === rule.locationId,
      )
      const currentQty = stock?.onHand ?? 0
      let status = 'Healthy'
      if (currentQty <= rule.minQty / 2) status = 'Critical'
      else if (currentQty <= rule.minQty) status = 'Reorder Required'
      return { ...rule, currentQty, status }
    })
  },
}
