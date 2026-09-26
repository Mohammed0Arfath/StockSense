import { getState, updateState, wait } from './store'
import { getProductById, getUserName } from './helpers'
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
      receipt.status = nextStatus[receipt.status]
      advanced = receipt

      if (receipt.status === 'done') {
        receipt.lines.forEach((line) => {
          const stock = draft.stockItems.find(
            (item) =>
              item.productId === line.productId && item.warehouseId === receipt.warehouseId && item.locationId === line.locationId,
          )
          if (stock) stock.onHand += line.receivedQuantity || line.expectedQuantity
          else {
            draft.stockItems.push({
              id: `s${Date.now()}${line.id}`,
              productId: line.productId,
              warehouseId: receipt.warehouseId,
              locationId: line.locationId,
              onHand: line.receivedQuantity || line.expectedQuantity,
              reserved: 0,
            })
          }
          const product = getProductById(line.productId)
          draft.moveHistory.unshift({
            id: `m${Date.now()}${line.id}`,
            timestamp: new Date().toISOString(),
            reference: receipt.receiptNumber,
            operation: 'Receipt',
            productId: line.productId,
            sku: product?.sku ?? 'UNKNOWN',
            source: receipt.vendor,
            destination: receipt.warehouseId,
            quantity: line.receivedQuantity || line.expectedQuantity,
            user: getUserName(receipt.createdBy),
            status: 'Done',
          })
        })
      }
    })
    return advanced
  },
}
