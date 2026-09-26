import { getState, updateState, wait } from './store'
import { inventoryEngine } from './inventoryEngine'
import type { DocumentStatus, Receipt } from '../types/domain'

const nextStatus: Record<DocumentStatus, DocumentStatus> = {
  draft: 'waiting',
  waiting: 'ready',
  ready: 'done',
  done: 'done',
  canceled: 'canceled',
}

export const receiptService = {
  async getReceipts() {
    await wait()
    return getState().receipts
  },

  async getReceipt(receiptId: string) {
    await wait(120)
    return getState().receipts.find((receipt) => receipt.id === receiptId) ?? null
  },

  async createReceipt(payload: Omit<Receipt, 'id'>) {
    await wait()
    const receipt = { ...payload, id: `r${Date.now()}` }
    updateState((draft) => draft.receipts.unshift(receipt))
    return receipt
  },

  async advanceStatus(receiptId: string) {
    await wait(120)
    let advanced: Receipt | null = null
    updateState((draft) => {
      const receipt = draft.receipts.find((row) => row.id === receiptId)
      if (!receipt || receipt.status === 'done' || receipt.status === 'canceled') return
      if (receipt.status === 'ready') {
        inventoryEngine.receive(draft, receiptId)
        advanced = receipt
        return
      }
      receipt.status = nextStatus[receipt.status]
      advanced = receipt
    })
    return advanced
  },
}
