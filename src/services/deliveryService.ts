import { wait } from './store'
import { inventoryEngine } from './inventoryEngine'
import { inventoryRepository } from './inventoryRepository'
import { createId } from './ids'
import type { Delivery } from '../types/domain'

export const deliveryService = {
  async getDeliveries() {
    await wait()
    return inventoryRepository.snapshot().deliveries
  },

  async getDelivery(deliveryId: string) {
    await wait(120)
    return inventoryRepository.snapshot().deliveries.find((delivery) => delivery.id === deliveryId) ?? null
  },

  async createDelivery(payload: Omit<Delivery, 'id'>) {
    await wait()
    const delivery = { ...payload, id: createId('delivery') }
    inventoryRepository.transact((draft) => draft.deliveries.unshift(delivery))
    return delivery
  },

  async canFulfillDelivery(deliveryId: string) {
    return inventoryEngine.canDeliver(inventoryRepository.snapshot(), deliveryId)
  },

  async advanceStatus(deliveryId: string) {
    await wait(120)
    return inventoryRepository.transact((draft) => inventoryEngine.advanceDelivery(draft, deliveryId))
  },
}
