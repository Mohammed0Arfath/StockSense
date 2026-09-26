import { wait } from './store'
import type { InternalTransfer } from '../types/domain'
import { inventoryEngine } from './inventoryEngine'
import { inventoryRepository } from './inventoryRepository'
import { createId } from './ids'

export const transferService = {
  async getTransfers() {
    await wait()
    return inventoryRepository.snapshot().transfers
  },

  async getTransfer(transferId: string) {
    await wait(120)
    return inventoryRepository.snapshot().transfers.find((transfer) => transfer.id === transferId) ?? null
  },

  async createTransfer(payload: Omit<InternalTransfer, 'id'>) {
    await wait()
    const transfer = { ...payload, id: createId('transfer') }
    inventoryRepository.transact((draft) => draft.transfers.unshift(transfer))
    return transfer
  },

  async advanceStatus(transferId: string) {
    await wait()
    return inventoryRepository.transact((draft) => inventoryEngine.advanceTransfer(draft, transferId))
  },
}
