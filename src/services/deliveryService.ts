import { getState, updateState, wait } from './store'
import { inventoryEngine } from './inventoryEngine'
import type { Delivery, DocumentStatus } from '../types/domain'

const nextStatus: Record<DocumentStatus, DocumentStatus> = {
  draft: 'waiting',
  waiting: 'ready',
  ready: 'done',
  done: 'done',
  canceled: 'canceled',
}

export const deliveryService = {
  async getDeliveries() {
    await wait()
    return getState().deliveries
  },

  async getDelivery(deliveryId: string) {
    await wait(120)
    return getState().deliveries.find((delivery) => delivery.id === deliveryId) ?? null
  },

  async createDelivery(payload: Omit<Delivery, 'id'>) {
    await wait()
    const delivery = { ...payload, id: `d${Date.now()}` }
    updateState((draft) => draft.deliveries.unshift(delivery))
    return delivery
  },

  async canFulfillDelivery(deliveryId: string) {
    const state = getState()
    const delivery = state.deliveries.find((d) => d.id === deliveryId)
    if (!delivery) return false
    return delivery.lines.every((line) => {
      const productExists = state.products.some((p) => p.id === line.productId)
      const available = state.stockItems
        .filter((row) => row.productId === line.productId && row.warehouseId === delivery.sourceWarehouseId)
        .reduce((sum, row) => sum + Math.max(row.onHand - row.reserved, 0), 0)
      return productExists && Number.isFinite(line.requestedQuantity) && line.requestedQuantity > 0 && line.requestedQuantity <= available
    })
  },

  async advanceStatus(deliveryId: string) {
    await wait(120)
    let advanced: Delivery | null = null
    updateState((draft) => {
      const delivery = draft.deliveries.find((row) => row.id === deliveryId)
      if (!delivery || delivery.status === 'done' || delivery.status === 'canceled') return
      if (delivery.status === 'ready') {
        inventoryEngine.deliver(draft, deliveryId)
        advanced = delivery
        return
      }
      delivery.status = nextStatus[delivery.status]
      advanced = delivery
    })
    return advanced
  },
}
