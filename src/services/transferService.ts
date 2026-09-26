import { getState, updateState, wait } from './store'
import type { DocumentStatus, InternalTransfer } from '../types/domain'
import { inventoryEngine } from './inventoryEngine'

const nextStatus: Record<DocumentStatus, DocumentStatus> = {
  draft: 'waiting',
  waiting: 'ready',
  ready: 'done',
  done: 'done',
  canceled: 'canceled',
}

export const transferService = {
  async getTransfers() {
    await wait()
    return getState().transfers
  },

  async getTransfer(transferId: string) {
    await wait(120)
    return getState().transfers.find((transfer) => transfer.id === transferId) ?? null
  },

  async createTransfer(payload: Omit<InternalTransfer, 'id'>) {
    await wait()
    const transfer = { ...payload, id: `t${Date.now()}` }
    updateState((draft) => draft.transfers.unshift(transfer))
    return transfer
  },

  async advanceStatus(transferId: string) {
    await wait()
    let advanced: InternalTransfer | null = null
    updateState((draft) => {
      const transfer = draft.transfers.find((row) => row.id === transferId)
      if (!transfer || transfer.status === 'done' || transfer.status === 'canceled') return
      if (transfer.status === 'ready') {
        inventoryEngine.transfer(draft, transferId)
        advanced = transfer
        return
      }
      transfer.status = nextStatus[transfer.status]
      advanced = transfer
    })
    return advanced
  },
}
