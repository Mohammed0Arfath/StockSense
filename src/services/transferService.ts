import { getState, updateState, wait } from './store'
import type { DocumentStatus, InternalTransfer } from '../types/domain'
import { getProductById } from './helpers'

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
      transfer.status = nextStatus[transfer.status]
      advanced = transfer
      if (transfer.status === 'done') {
        transfer.lines.forEach((line) => {
          const source = draft.stockItems.find(
            (item) =>
              item.productId === line.productId &&
              item.warehouseId === transfer.sourceWarehouseId &&
              item.locationId === transfer.sourceLocationId,
          )
          if (!source || source.onHand < line.quantity) return
          source.onHand -= line.quantity

          const destination = draft.stockItems.find(
            (item) =>
              item.productId === line.productId &&
              item.warehouseId === transfer.destinationWarehouseId &&
              item.locationId === transfer.destinationLocationId,
          )
          if (destination) destination.onHand += line.quantity
          else {
            draft.stockItems.push({
              id: `s${Date.now()}${line.id}`,
              productId: line.productId,
              warehouseId: transfer.destinationWarehouseId,
              locationId: transfer.destinationLocationId,
              onHand: line.quantity,
              reserved: 0,
            })
          }

          const product = getProductById(line.productId)
          draft.moveHistory.unshift({
            id: `m${Date.now()}${line.id}`,
            timestamp: new Date().toISOString(),
            reference: transfer.transferNumber,
            operation: 'Internal Transfer',
            productId: line.productId,
            sku: product?.sku ?? 'UNKNOWN',
            source: `${transfer.sourceWarehouseId}/${transfer.sourceLocationId}`,
            destination: `${transfer.destinationWarehouseId}/${transfer.destinationLocationId}`,
            quantity: line.quantity,
            user: 'Aisha Khan',
            status: 'Done',
          })
        })
      }
    })
    return advanced
  },
}
