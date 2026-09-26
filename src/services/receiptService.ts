import { wait } from './store'
import { inventoryEngine } from './inventoryEngine'
import { inventoryRepository } from './inventoryRepository'
import { createId } from './ids'
import type { Receipt } from '../types/domain'

export const receiptService = {
  async getReceipts() {
    await wait()
    return inventoryRepository.snapshot().receipts
  },

  async getReceipt(receiptId: string) {
    await wait(120)
    return inventoryRepository.snapshot().receipts.find((receipt) => receipt.id === receiptId) ?? null
  },

  async createReceipt(payload: Omit<Receipt, 'id'>) {
    await wait()
    const receipt = { ...payload, id: createId('receipt') }
    inventoryRepository.transact((draft) => draft.receipts.unshift(receipt))
    return receipt
  },

  async advanceStatus(receiptId: string) {
    await wait(120)
    return inventoryRepository.transact((draft) => inventoryEngine.advanceReceipt(draft, receiptId))
  },
}
