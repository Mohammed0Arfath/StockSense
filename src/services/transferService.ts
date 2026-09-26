import type { InternalTransfer } from '../types/domain'
import { inventoryEngine } from './inventoryEngine'
import { inventoryRepository } from './inventoryRepository'
import { createId } from './ids'

export const transferService = {
  async getTransfers() {
    return inventoryRepository.snapshot().transfers
  },

  async getTransfer(transferId: string) {
    return inventoryRepository.snapshot().transfers.find((transfer) => transfer.id === transferId) ?? null
  },

  async createTransfer(payload: Omit<InternalTransfer, 'id'>) {
    const transfer = { ...payload, id: createId('transfer'), statusHistory: payload.statusHistory ?? [{ status: 'draft' as const, timestamp: new Date().toISOString() }] }
    return inventoryEngine.createTransfer(transfer)
  },

  async advanceStatus(transferId: string) {
    return inventoryEngine.advanceTransfer(transferId)
  },

  async cancelTransfer(transferId: string) {
    return inventoryEngine.cancelTransfer(transferId)
  },
}
