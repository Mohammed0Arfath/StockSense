import { inventoryEngine } from './inventoryEngine'
import { inventoryRepository } from './inventoryRepository'
import { createId } from './ids'
import type { Receipt } from '../types/domain'

export const receiptService = {
  async getReceipts() {
    return inventoryRepository.snapshot().receipts
  },

  async getReceipt(receiptId: string) {
    return inventoryRepository.snapshot().receipts.find((receipt) => receipt.id === receiptId) ?? null
  },

  async createReceipt(payload: Omit<Receipt, 'id'>) {
    const receipt = { ...payload, id: createId('receipt'), statusHistory: payload.statusHistory ?? [{ status: 'draft' as const, timestamp: new Date().toISOString() }] }
    return inventoryEngine.createReceipt(receipt)
  },

  async advanceStatus(receiptId: string) {
    return inventoryEngine.advanceReceipt(receiptId)
  },

  async cancelReceipt(receiptId: string) {
    return inventoryEngine.cancelReceipt(receiptId)
  },
}
