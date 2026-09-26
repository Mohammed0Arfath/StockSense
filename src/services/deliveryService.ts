import { inventoryEngine } from './inventoryEngine'
import { inventoryRepository } from './inventoryRepository'
import { createId } from './ids'
import type { Delivery } from '../types/domain'

export const deliveryService = {
  async getDeliveries() {
    return inventoryRepository.snapshot().deliveries
  },

  async getDelivery(deliveryId: string) {
    return inventoryRepository.snapshot().deliveries.find((delivery) => delivery.id === deliveryId) ?? null
  },

  async createDelivery(payload: Omit<Delivery, 'id'>) {
    const delivery = { ...payload, id: createId('delivery'), statusHistory: payload.statusHistory ?? [{ status: 'draft' as const, timestamp: new Date().toISOString() }] }
    inventoryRepository.transact((draft) => draft.deliveries.unshift(delivery))
    return delivery
  },

  async canFulfillDelivery(deliveryId: string) {
    return inventoryEngine.canDeliver(inventoryRepository.snapshot(), deliveryId)
  },

  async advanceStatus(deliveryId: string) {
    return inventoryRepository.transact((draft) => inventoryEngine.advanceDelivery(draft, deliveryId))
  },

  async pickDelivery(deliveryId: string) {
    return inventoryRepository.transact((draft) => inventoryEngine.pickDelivery(draft, deliveryId))
  },

  async packDelivery(deliveryId: string) {
    return inventoryRepository.transact((draft) => inventoryEngine.packDelivery(draft, deliveryId))
  },

  async cancelDelivery(deliveryId: string) {
    return inventoryRepository.transact((draft) => inventoryEngine.cancelDelivery(draft, deliveryId))
  },
}
