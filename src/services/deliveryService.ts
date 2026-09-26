import { getState, updateState, wait } from './store'
import { aggregateProductStock } from '../utils/inventory'
import { getProductById, getUserName } from './helpers'
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
      const product = state.products.find((p) => p.id === line.productId)
      if (!product) return false
      const available = aggregateProductStock(product, state.stockItems).available
      return line.requestedQuantity <= available
    })
  },

  async advanceStatus(deliveryId: string) {
    await wait(120)
    const canFulfill = await this.canFulfillDelivery(deliveryId)
    let advanced: Delivery | null = null
    updateState((draft) => {
      const delivery = draft.deliveries.find((row) => row.id === deliveryId)
      if (!delivery || delivery.status === 'done' || delivery.status === 'canceled') return
      if (delivery.status === 'ready' && !canFulfill) return
      delivery.status = nextStatus[delivery.status]
      advanced = delivery
      if (delivery.status === 'done') {
        delivery.lines.forEach((line) => {
          const stock = draft.stockItems.find(
            (item) => item.productId === line.productId && item.warehouseId === delivery.sourceWarehouseId,
          )
          if (!stock) return
          stock.onHand = Math.max(stock.onHand - line.requestedQuantity, 0)
          const product = getProductById(line.productId)
          draft.moveHistory.unshift({
            id: `m${Date.now()}${line.id}`,
            timestamp: new Date().toISOString(),
            reference: delivery.deliveryNumber,
            operation: 'Delivery',
            productId: line.productId,
            sku: product?.sku ?? 'UNKNOWN',
            source: delivery.sourceWarehouseId,
            destination: delivery.customer,
            quantity: -line.requestedQuantity,
            user: getUserName(delivery.createdBy),
            status: 'Done',
          })
        })
      }
    })
    return advanced
  },
}
