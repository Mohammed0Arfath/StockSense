import { wait } from './store'
import type { StockAdjustment } from '../types/domain'
import { inventoryEngine } from './inventoryEngine'
import { inventoryRepository } from './inventoryRepository'
import { createId } from './ids'

export const adjustmentService = {
  async getAdjustments() {
    await wait()
    return inventoryRepository.snapshot().adjustments
  },

  async getAdjustment(adjustmentId: string) {
    await wait(120)
    return inventoryRepository.snapshot().adjustments.find((adjustment) => adjustment.id === adjustmentId) ?? null
  },

  async createAdjustment(payload: Omit<StockAdjustment, 'id' | 'status' | 'adjustmentNumber'>) {
    await wait()
    const adjustment: StockAdjustment = {
      ...payload,
      id: createId('adjustment'),
      status: 'draft',
      adjustmentNumber: `ADJ-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,
    }
    inventoryRepository.transact((draft) => draft.adjustments.unshift(adjustment))
    return adjustment
  },

  async applyAdjustment(adjustmentId: string) {
    await wait(150)
    return inventoryRepository.transact((draft) => {
      const adjustment = draft.adjustments.find((item) => item.id === adjustmentId)
      if (!adjustment || adjustment.status === 'applied') return null
      inventoryEngine.adjust(draft, adjustmentId)
      return adjustment
    })
  },
}
