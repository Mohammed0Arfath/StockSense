import { getState, updateState, wait } from './store'
import type { StockAdjustment } from '../types/domain'
import { getProductById, getUserName } from './helpers'

export const adjustmentService = {
  async getAdjustments() {
    await wait()
    return getState().adjustments
  },

  async getAdjustment(adjustmentId: string) {
    await wait(120)
    return getState().adjustments.find((adjustment) => adjustment.id === adjustmentId) ?? null
  },

  async createAdjustment(payload: Omit<StockAdjustment, 'id' | 'status' | 'adjustmentNumber'>) {
    await wait()
    const adjustment: StockAdjustment = {
      ...payload,
      id: `a${Date.now()}`,
      status: 'draft',
      adjustmentNumber: `ADJ-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,
    }
    updateState((draft) => draft.adjustments.unshift(adjustment))
    return adjustment
  },

  async applyAdjustment(adjustmentId: string) {
    await wait(150)
    let applied: StockAdjustment | null = null
    updateState((draft) => {
      const adjustment = draft.adjustments.find((item) => item.id === adjustmentId)
      if (!adjustment || adjustment.status === 'applied') return
      const stock = draft.stockItems.find(
        (item) =>
          item.productId === adjustment.productId &&
          item.warehouseId === adjustment.warehouseId &&
          item.locationId === adjustment.locationId,
      )
      if (!stock) return
      stock.onHand = adjustment.countedQuantity
      adjustment.status = 'applied'
      applied = adjustment
      const product = getProductById(adjustment.productId)
      draft.moveHistory.unshift({
        id: `m${Date.now()}${adjustment.id}`,
        timestamp: new Date().toISOString(),
        reference: adjustment.adjustmentNumber,
        operation: 'Adjustment',
        productId: adjustment.productId,
        sku: product?.sku ?? 'UNKNOWN',
        source: `${adjustment.warehouseId}/${adjustment.locationId}`,
        destination: `${adjustment.warehouseId}/${adjustment.locationId}`,
        quantity: adjustment.countedQuantity - adjustment.systemQuantity,
        user: getUserName(adjustment.createdBy),
        status: 'Applied',
      })
    })
    return applied
  },
}
