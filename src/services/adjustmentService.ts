import { getState, updateState, wait } from './store'
import type { StockAdjustment } from '../types/domain'
import { inventoryEngine } from './inventoryEngine'

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
      inventoryEngine.adjust(draft, adjustmentId)
      applied = adjustment
    })
    return applied
  },
}
