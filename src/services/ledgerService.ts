import { inventoryRepository } from './inventoryRepository'
import type { MoveHistoryEntry } from '../types/domain'

const documentForEntry = (entry: MoveHistoryEntry, state: ReturnType<typeof inventoryRepository.snapshot>) => {
  switch (entry.operation) {
    case 'Receipt': {
      const document = state.receipts.find((row) => row.id === entry.documentId || row.receiptNumber === entry.reference)
      return document ? { label: `Receipt ${document.receiptNumber}`, href: `/receipts/${document.id}` } : null
    }
    case 'Delivery': {
      const document = state.deliveries.find((row) => row.id === entry.documentId || row.deliveryNumber === entry.reference)
      return document ? { label: `Delivery ${document.deliveryNumber}`, href: `/deliveries/${document.id}` } : null
    }
    case 'Internal Transfer': {
      const document = state.transfers.find((row) => row.id === entry.documentId || row.transferNumber === entry.reference)
      return document ? { label: `Transfer ${document.transferNumber}`, href: `/transfers/${document.id}` } : null
    }
    case 'Adjustment': {
      const document = state.adjustments.find((row) => row.id === entry.documentId || row.adjustmentNumber === entry.reference)
      return document ? { label: `Adjustment ${document.adjustmentNumber}`, href: `/adjustments/${document.id}` } : null
    }
  }
}

const warehouseIdFromLabel = (label: string, state: ReturnType<typeof inventoryRepository.snapshot>) =>
  state.warehouses.find((warehouse) => label.includes(warehouse.name))?.id

const locationIdFromLabel = (label: string, warehouseId: string | undefined, state: ReturnType<typeof inventoryRepository.snapshot>) =>
  state.locations.find((location) => (!warehouseId || location.warehouseId === warehouseId) && (label.includes(location.name) || label.includes(location.shortCode)))?.id

export const ledgerService = {
  async getEntries() {
    const state = inventoryRepository.snapshot()
    return state.moveHistory.map((entry) => {
      const sourceWarehouseId = entry.sourceWarehouseId ?? warehouseIdFromLabel(entry.source, state)
      const destinationWarehouseId = entry.destinationWarehouseId ?? warehouseIdFromLabel(entry.destination, state)
      return {
        ...entry,
        product: state.products.find((row) => row.id === entry.productId),
        sourceWarehouseId,
        sourceLocationId: entry.sourceLocationId ?? locationIdFromLabel(entry.source, sourceWarehouseId, state),
        destinationWarehouseId,
        destinationLocationId: entry.destinationLocationId ?? locationIdFromLabel(entry.destination, destinationWarehouseId, state),
        document: documentForEntry(entry, state),
      }
    })
  },

  async getEntryDetail(entryId: string) {
    const state = inventoryRepository.snapshot()
    const entry = state.moveHistory.find((row) => row.id === entryId)
    if (!entry) return null
    const sourceWarehouseId = entry.sourceWarehouseId ?? warehouseIdFromLabel(entry.source, state)
    const destinationWarehouseId = entry.destinationWarehouseId ?? warehouseIdFromLabel(entry.destination, state)
    return {
      entry,
      product: state.products.find((row) => row.id === entry.productId),
      sourceWarehouse: state.warehouses.find((row) => row.id === sourceWarehouseId),
      sourceLocation: state.locations.find((row) => row.id === (entry.sourceLocationId ?? locationIdFromLabel(entry.source, sourceWarehouseId, state))),
      destinationWarehouse: state.warehouses.find((row) => row.id === destinationWarehouseId),
      destinationLocation: state.locations.find((row) => row.id === (entry.destinationLocationId ?? locationIdFromLabel(entry.destination, destinationWarehouseId, state))),
      document: documentForEntry(entry, state),
    }
  },
}
