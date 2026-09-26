import type { StockAdjustment } from '../types/domain'
import { inventoryEngine } from './inventoryEngine'
import { inventoryRepository } from './inventoryRepository'
import { createId } from './ids'

export const adjustmentService = {
  async getAdjustments() {
    return inventoryRepository.snapshot().adjustments
  },

  async getAdjustment(adjustmentId: string) {
    return inventoryRepository.snapshot().adjustments.find((adjustment) => adjustment.id === adjustmentId) ?? null
  },

  async createAdjustment(payload: Omit<StockAdjustment, 'id' | 'status' | 'adjustmentNumber'>) {
    const adjustment: StockAdjustment = {
      ...payload,
      id: createId('adjustment'),
      status: 'draft',
      statusHistory: [{ status: 'draft', timestamp: new Date().toISOString() }],
      adjustmentNumber: `ADJ-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,
    }
    return inventoryEngine.createAdjustment(adjustment)
  },

  async applyAdjustment(adjustmentId: string) {
    return inventoryEngine.applyAdjustment(adjustmentId)
  },
}
