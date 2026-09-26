import type { Delivery, DocumentStatus, InternalTransfer, InventoryState, OperationStatus, Receipt, StockItem } from '../types/domain'
import { getUserName, getWarehouseName } from './helpers'
import { createId } from './ids'
import { inventoryRepository, isPersistentInventory } from './inventoryRepository'

export class InventoryOperationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InventoryOperationError'
  }
}

const nextStatus: Record<DocumentStatus, DocumentStatus> = {
  draft: 'waiting',
  waiting: 'ready',
  ready: 'done',
  done: 'done',
  canceled: 'canceled',
}

const advanceStatus = (status: DocumentStatus) => nextStatus[status]

const recordStatus = (operation: { statusHistory?: { status: OperationStatus; timestamp: string }[] }, status: OperationStatus) => {
  operation.statusHistory = [...(operation.statusHistory ?? []), { status, timestamp: new Date().toISOString() }]
}

const requireQuantity = (quantity: number, label: string) => {
  if (!Number.isFinite(quantity) || quantity < 0) throw new InventoryOperationError(`${label} must be a valid non-negative quantity.`)
}

const requireProduct = (state: InventoryState, productId: string) => {
  const product = state.products.find((row) => row.id === productId)
  if (!product) throw new InventoryOperationError('The selected product no longer exists.')
  return product
}

const requireLocation = (state: InventoryState, locationId: string, warehouseId: string) => {
  const location = state.locations.find((row) => row.id === locationId && row.warehouseId === warehouseId && row.status === 'active')
  if (!location) throw new InventoryOperationError('Choose an active location in the selected warehouse.')
  return location
}

const requireDocumentFields = (value: string, label: string) => {
  if (!value.trim()) throw new InventoryOperationError(`${label} is required.`)
}

const validateReceiptReady = (state: InventoryState, receipt: Receipt) => {
  requireDocumentFields(receipt.receiptNumber, 'Receipt number')
  requireDocumentFields(receipt.vendor, 'Vendor')
  requireDocumentFields(receipt.scheduledDate, 'Scheduled date')
  if (!state.warehouses.some((row) => row.id === receipt.warehouseId && row.status === 'active')) throw new InventoryOperationError('Choose an active warehouse for this receipt.')
  if (!receipt.lines.length) throw new InventoryOperationError('Add at least one product line before readying this receipt.')
  for (const line of receipt.lines) {
    requireProduct(state, line.productId)
    requireLocation(state, line.locationId, receipt.warehouseId)
    requireQuantity(line.expectedQuantity, 'Expected quantity')
    requireQuantity(line.receivedQuantity, 'Received quantity')
    if (line.expectedQuantity <= 0 || line.receivedQuantity <= 0) throw new InventoryOperationError('Expected and received quantities must be greater than zero.')
  }
}

const validateDeliveryLines = (state: InventoryState, delivery: Delivery) => {
  requireDocumentFields(delivery.deliveryNumber, 'Delivery number')
  requireDocumentFields(delivery.customer, 'Customer')
  requireDocumentFields(delivery.scheduledDate, 'Scheduled date')
  if (!state.warehouses.some((row) => row.id === delivery.sourceWarehouseId && row.status === 'active')) throw new InventoryOperationError('Choose an active source warehouse.')
  const source = requireLocation(state, delivery.sourceLocationId, delivery.sourceWarehouseId)
  if (!delivery.lines.length) throw new InventoryOperationError('Add at least one product line before picking this delivery.')
  const requestedByProduct = new Map<string, number>()
  for (const line of delivery.lines) {
    requireProduct(state, line.productId)
    requireQuantity(line.requestedQuantity, 'Requested quantity')
    if (line.requestedQuantity <= 0) throw new InventoryOperationError('Requested quantity must be greater than zero.')
    requestedByProduct.set(line.productId, (requestedByProduct.get(line.productId) ?? 0) + line.requestedQuantity)
  }
  for (const [productId, requested] of requestedByProduct) {
    const product = requireProduct(state, productId)
    const stock = findStock(state, productId, delivery.sourceWarehouseId, source.id)
    const available = stock ? Math.max(stock.onHand - stock.reserved, 0) : 0
    if (available < requested) throw new InventoryOperationError(`Unable to pick delivery: requested ${requested} units of ${product.name}, but only ${available} are available in ${source.name}.`)
  }
  return source
}

const validateTransfer = (state: InventoryState, transfer: InternalTransfer) => {
  requireDocumentFields(transfer.transferNumber, 'Transfer number')
  requireDocumentFields(transfer.scheduledDate, 'Scheduled date')
  if (transfer.sourceWarehouseId === transfer.destinationWarehouseId && transfer.sourceLocationId === transfer.destinationLocationId) throw new InventoryOperationError('Source and destination must be different locations.')
  const sourceLocation = requireLocation(state, transfer.sourceLocationId, transfer.sourceWarehouseId)
  const destinationLocation = requireLocation(state, transfer.destinationLocationId, transfer.destinationWarehouseId)
  if (!transfer.lines.length) throw new InventoryOperationError('Add at least one product line before readying this transfer.')
  const requestedByProduct = new Map<string, number>()
  for (const line of transfer.lines) {
    requireProduct(state, line.productId)
    requireQuantity(line.quantity, 'Transfer quantity')
    if (line.quantity <= 0) throw new InventoryOperationError('Transfer quantity must be greater than zero.')
    requestedByProduct.set(line.productId, (requestedByProduct.get(line.productId) ?? 0) + line.quantity)
  }
  for (const [productId, requested] of requestedByProduct) {
    const product = requireProduct(state, productId)
    const stock = findStock(state, productId, transfer.sourceWarehouseId, sourceLocation.id)
    const available = stock ? Math.max(stock.onHand - stock.reserved, 0) : 0
    if (available < requested) throw new InventoryOperationError(`Unable to validate transfer: requested ${requested} units of ${product.name}, but only ${available} are available in ${sourceLocation.name}.`)
  }
  return { sourceLocation, destinationLocation }
}

const findStock = (state: InventoryState, productId: string, warehouseId: string, locationId: string) =>
  state.stockItems.find((row) => row.productId === productId && row.warehouseId === warehouseId && row.locationId === locationId)

const ensureStock = (state: InventoryState, productId: string, warehouseId: string, locationId: string): StockItem => {
  const existing = findStock(state, productId, warehouseId, locationId)
  if (existing) return existing
  const stock: StockItem = { id: createId('stock'), productId, warehouseId, locationId, onHand: 0, reserved: 0 }
  state.stockItems.push(stock)
  return stock
}

const addLedgerEntry = (state: InventoryState, entry: Omit<InventoryState['moveHistory'][number], 'id' | 'timestamp'>) => {
  state.moveHistory.unshift({ ...entry, id: createId('move'), timestamp: new Date().toISOString() })
}

const domainInventoryEngine = {
  initializeProductStock(state: InventoryState, productId: string, quantity: number, userId: string) {
    const product = requireProduct(state, productId)
    requireQuantity(quantity, 'Initial quantity')
    const location = requireLocation(state, product.defaultLocationId, product.defaultWarehouseId)
    const stock = ensureStock(state, product.id, product.defaultWarehouseId, location.id)
    stock.onHand += quantity
    if (quantity > 0) {
      const destination = `${getWarehouseName(product.defaultWarehouseId)} / ${location.name}`
      addLedgerEntry(state, {
        reference: product.sku,
        operation: 'Adjustment',
        productId: product.id,
        sku: product.sku,
        source: 'Initial balance',
        destination,
        quantity,
        user: getUserName(userId),
        status: 'Applied',
        documentId: product.id,
        destinationWarehouseId: product.defaultWarehouseId,
        destinationLocationId: location.id,
      })
    }
  },

  canDeliver(state: InventoryState, deliveryId: string) {
    const delivery = state.deliveries.find((row) => row.id === deliveryId)
    if (!delivery || delivery.lines.length === 0) return false
    const source = state.locations.find((row) => row.id === delivery.sourceLocationId && row.warehouseId === delivery.sourceWarehouseId && row.status === 'active')
    if (!source) return false
    const requestedByProduct = new Map<string, number>()
    for (const line of delivery.lines) {
      if (!Number.isFinite(line.requestedQuantity) || line.requestedQuantity <= 0) return false
      requestedByProduct.set(line.productId, (requestedByProduct.get(line.productId) ?? 0) + line.requestedQuantity)
    }
    return [...requestedByProduct].every(([productId, requested]) => {
      if (!state.products.some((product) => product.id === productId)) return false
      const available = state.stockItems
        .filter((stock) => stock.productId === productId && stock.warehouseId === delivery.sourceWarehouseId && stock.locationId === source.id)
        .reduce((sum, stock) => sum + Math.max(stock.onHand - stock.reserved, 0), 0)
      return available >= requested
    })
  },

  advanceReceipt(state: InventoryState, receiptId: string): Receipt | null {
    const receipt = state.receipts.find((row) => row.id === receiptId)
    if (!receipt || receipt.status === 'done' || receipt.status === 'canceled') return null
    if (receipt.status === 'ready') this.receive(state, receiptId)
    else {
      const status = advanceStatus(receipt.status)
      if (status === 'ready') validateReceiptReady(state, receipt)
      receipt.status = status
      recordStatus(receipt, status)
    }
    return receipt
  },

  cancelReceipt(state: InventoryState, receiptId: string) {
    const receipt = state.receipts.find((row) => row.id === receiptId)
    if (!receipt || receipt.status === 'done' || receipt.status === 'canceled') return null
    receipt.status = 'canceled'
    recordStatus(receipt, 'canceled')
    return receipt
  },

  advanceDelivery(state: InventoryState, deliveryId: string): Delivery | null {
    const delivery = state.deliveries.find((row) => row.id === deliveryId)
    if (!delivery || delivery.status === 'done' || delivery.status === 'canceled') return null
    if (delivery.status === 'ready') this.deliver(state, deliveryId)
    else if (delivery.status === 'draft') {
      validateDeliveryLines(state, delivery)
      delivery.lines.forEach((line) => { line.pickedQuantity = line.requestedQuantity })
      delivery.status = 'waiting'
      recordStatus(delivery, 'waiting')
    } else if (delivery.status === 'waiting') {
      delivery.lines.forEach((line) => {
        if (line.pickedQuantity < line.requestedQuantity) throw new InventoryOperationError('Pick all requested quantities before packing this delivery.')
        line.packedQuantity = line.pickedQuantity
      })
      delivery.status = 'ready'
      recordStatus(delivery, 'ready')
    }
    return delivery
  },

  pickDelivery(state: InventoryState, deliveryId: string) {
    const delivery = state.deliveries.find((row) => row.id === deliveryId)
    if (!delivery || delivery.status !== 'draft') throw new InventoryOperationError('Only a draft delivery can be picked.')
    validateDeliveryLines(state, delivery)
    delivery.lines.forEach((line) => { line.pickedQuantity = line.requestedQuantity })
    delivery.status = 'waiting'
    recordStatus(delivery, 'waiting')
    return delivery
  },

  packDelivery(state: InventoryState, deliveryId: string) {
    const delivery = state.deliveries.find((row) => row.id === deliveryId)
    if (!delivery || delivery.status !== 'waiting') throw new InventoryOperationError('Pick this delivery before packing it.')
    delivery.lines.forEach((line) => {
      if (line.pickedQuantity < line.requestedQuantity) throw new InventoryOperationError('Pick all requested quantities before packing this delivery.')
      line.packedQuantity = line.pickedQuantity
    })
    delivery.status = 'ready'
    recordStatus(delivery, 'ready')
    return delivery
  },

  cancelDelivery(state: InventoryState, deliveryId: string) {
    const delivery = state.deliveries.find((row) => row.id === deliveryId)
    if (!delivery || delivery.status === 'done' || delivery.status === 'canceled') return null
    delivery.status = 'canceled'
    recordStatus(delivery, 'canceled')
    return delivery
  },

  advanceTransfer(state: InventoryState, transferId: string): InternalTransfer | null {
    const transfer = state.transfers.find((row) => row.id === transferId)
    if (!transfer || transfer.status === 'done' || transfer.status === 'canceled') return null
    if (transfer.status === 'ready') this.transfer(state, transferId)
    else {
      const status = advanceStatus(transfer.status)
      if (status === 'ready') validateTransfer(state, transfer)
      transfer.status = status
      recordStatus(transfer, status)
    }
    return transfer
  },

  cancelTransfer(state: InventoryState, transferId: string) {
    const transfer = state.transfers.find((row) => row.id === transferId)
    if (!transfer || transfer.status === 'done' || transfer.status === 'canceled') return null
    transfer.status = 'canceled'
    recordStatus(transfer, 'canceled')
    return transfer
  },

  receive(state: InventoryState, receiptId: string) {
    const receipt = state.receipts.find((row) => row.id === receiptId)
    if (!receipt) throw new InventoryOperationError('Receipt not found.')
    if (receipt.status !== 'ready') throw new InventoryOperationError('Only a ready receipt can be validated.')
    validateReceiptReady(state, receipt)
    const lines = receipt.lines.map((line) => {
      requireProduct(state, line.productId)
      const location = requireLocation(state, line.locationId, receipt.warehouseId)
      const quantity = line.receivedQuantity
      requireQuantity(quantity, 'Received quantity')
      if (quantity === 0) throw new InventoryOperationError('Received quantity must be greater than zero.')
      return { line, location, quantity }
    })
    for (const { line, location, quantity } of lines) {
      const stock = ensureStock(state, line.productId, receipt.warehouseId, location.id)
      stock.onHand += quantity
      const product = requireProduct(state, line.productId)
      addLedgerEntry(state, { reference: receipt.receiptNumber, operation: 'Receipt', productId: product.id, sku: product.sku, source: receipt.vendor, destination: `${getWarehouseName(receipt.warehouseId)} / ${location.name}`, quantity, user: getUserName(receipt.createdBy), status: 'Done', documentId: receipt.id, destinationWarehouseId: receipt.warehouseId, destinationLocationId: location.id })
    }
    receipt.status = 'done'
    recordStatus(receipt, 'done')
  },

  deliver(state: InventoryState, deliveryId: string) {
    const delivery = state.deliveries.find((row) => row.id === deliveryId)
    if (!delivery) throw new InventoryOperationError('Delivery not found.')
    if (delivery.status !== 'ready') throw new InventoryOperationError('Only a ready delivery can be validated.')
    const sourceLocation = validateDeliveryLines(state, delivery)
    const requestedByProduct = new Map<string, number>()
    for (const line of delivery.lines) {
      requireQuantity(line.requestedQuantity, 'Delivery quantity')
      if (line.requestedQuantity === 0) throw new InventoryOperationError('Delivery quantity must be greater than zero.')
      requestedByProduct.set(line.productId, (requestedByProduct.get(line.productId) ?? 0) + line.requestedQuantity)
    }
    for (const [productId, requested] of requestedByProduct) {
      const product = requireProduct(state, productId)
      const stock = findStock(state, productId, delivery.sourceWarehouseId, sourceLocation.id)
      const available = stock ? Math.max(stock.onHand - stock.reserved, 0) : 0
      if (available < requested) throw new InventoryOperationError(`Unable to validate delivery: requested ${requested} units of ${product.name}, but only ${available} are available in ${sourceLocation.name}.`)
    }
    const planned = delivery.lines.map((line) => {
      requireProduct(state, line.productId)
      if (line.packedQuantity < line.requestedQuantity) throw new InventoryOperationError('Pack all requested quantities before validating this delivery.')
      const stock = findStock(state, line.productId, delivery.sourceWarehouseId, sourceLocation.id)
      if (!stock) throw new InventoryOperationError(`No stock record exists for ${requireProduct(state, line.productId).name} at ${sourceLocation.name}.`)
      return { line, stock }
    })
    for (const { line, stock } of planned) {
      stock.onHand -= line.requestedQuantity
      const product = requireProduct(state, line.productId)
      addLedgerEntry(state, { reference: delivery.deliveryNumber, operation: 'Delivery', productId: product.id, sku: product.sku, source: `${getWarehouseName(delivery.sourceWarehouseId)} / ${sourceLocation.name}`, destination: delivery.customer, quantity: -line.requestedQuantity, user: getUserName(delivery.createdBy), status: 'Done', documentId: delivery.id, sourceWarehouseId: delivery.sourceWarehouseId, sourceLocationId: sourceLocation.id })
    }
    delivery.status = 'done'
    recordStatus(delivery, 'done')
  },

  transfer(state: InventoryState, transferId: string) {
    const transfer = state.transfers.find((row) => row.id === transferId)
    if (!transfer) throw new InventoryOperationError('Transfer not found.')
    if (transfer.status !== 'ready') throw new InventoryOperationError('Only a ready transfer can be validated.')
    const { sourceLocation, destinationLocation } = validateTransfer(state, transfer)
    const planned = transfer.lines.map((line) => {
      requireProduct(state, line.productId)
      const source = findStock(state, line.productId, transfer.sourceWarehouseId, sourceLocation.id)
      if (!source) throw new InventoryOperationError(`No stock record exists for ${requireProduct(state, line.productId).name} at ${sourceLocation.name}.`)
      return { line, source }
    })
    for (const { line, source } of planned) {
      source.onHand -= line.quantity
      ensureStock(state, line.productId, transfer.destinationWarehouseId, destinationLocation.id).onHand += line.quantity
      const product = requireProduct(state, line.productId)
      addLedgerEntry(state, { reference: transfer.transferNumber, operation: 'Internal Transfer', productId: product.id, sku: product.sku, source: `${getWarehouseName(transfer.sourceWarehouseId)} / ${sourceLocation.name}`, destination: `${getWarehouseName(transfer.destinationWarehouseId)} / ${destinationLocation.name}`, quantity: line.quantity, user: 'System', status: 'Done', documentId: transfer.id, sourceWarehouseId: transfer.sourceWarehouseId, sourceLocationId: sourceLocation.id, destinationWarehouseId: transfer.destinationWarehouseId, destinationLocationId: destinationLocation.id })
    }
    transfer.status = 'done'
    recordStatus(transfer, 'done')
  },

  adjust(state: InventoryState, adjustmentId: string) {
    const adjustment = state.adjustments.find((row) => row.id === adjustmentId)
    if (!adjustment) throw new InventoryOperationError('Adjustment not found.')
    if (adjustment.status !== 'draft') throw new InventoryOperationError('Only a draft adjustment can be applied.')
    const product = requireProduct(state, adjustment.productId)
    const location = requireLocation(state, adjustment.locationId, adjustment.warehouseId)
    requireQuantity(adjustment.countedQuantity, 'Counted quantity')
    const stock = ensureStock(state, product.id, adjustment.warehouseId, location.id)
    const systemQuantity = stock.onHand
    const difference = adjustment.countedQuantity - systemQuantity
    if (adjustment.countedQuantity < stock.reserved) throw new InventoryOperationError('Counted quantity cannot be less than reserved stock.')
    stock.onHand = adjustment.countedQuantity
    adjustment.systemQuantity = systemQuantity
    adjustment.status = 'applied'
    const locationLabel = `${getWarehouseName(adjustment.warehouseId)} / ${location.name}`
    addLedgerEntry(state, { reference: adjustment.adjustmentNumber, operation: 'Adjustment', productId: product.id, sku: product.sku, source: locationLabel, destination: locationLabel, quantity: difference, user: getUserName(adjustment.createdBy), status: 'Applied', documentId: adjustment.id, sourceWarehouseId: adjustment.warehouseId, sourceLocationId: location.id, destinationWarehouseId: adjustment.warehouseId, destinationLocationId: location.id })
    recordStatus(adjustment, 'applied')
  },
}

/** Application mutation boundary. Production writes always go through this engine before persistence. */
export const inventoryEngine = {
  ...domainInventoryEngine,

  async createReceipt(receipt: Receipt) {
    if (isPersistentInventory) await inventoryRepository.createReceipt(receipt as unknown as Record<string, unknown>)
    else inventoryRepository.transact((draft) => draft.receipts.unshift(receipt))
    return inventoryRepository.snapshot().receipts.find((row) => row.id === receipt.id) ?? receipt
  },
  async createDelivery(delivery: Delivery) {
    if (isPersistentInventory) await inventoryRepository.createDelivery(delivery as unknown as Record<string, unknown>)
    else inventoryRepository.transact((draft) => draft.deliveries.unshift(delivery))
    return inventoryRepository.snapshot().deliveries.find((row) => row.id === delivery.id) ?? delivery
  },
  async createTransfer(transfer: InternalTransfer) {
    if (isPersistentInventory) await inventoryRepository.createTransfer(transfer as unknown as Record<string, unknown>)
    else inventoryRepository.transact((draft) => draft.transfers.unshift(transfer))
    return inventoryRepository.snapshot().transfers.find((row) => row.id === transfer.id) ?? transfer
  },
  async createAdjustment(adjustment: InventoryState['adjustments'][number]) {
    if (isPersistentInventory) await inventoryRepository.createAdjustment(adjustment as unknown as Record<string, unknown>)
    else inventoryRepository.transact((draft) => draft.adjustments.unshift(adjustment))
    return inventoryRepository.snapshot().adjustments.find((row) => row.id === adjustment.id) ?? adjustment
  },
  async createProduct(product: InventoryState['products'][number], initialStock: number) {
    if (isPersistentInventory) await inventoryRepository.createProduct({ ...product, initialStock })
    else inventoryRepository.transact((draft) => {
      draft.products.unshift(product)
      domainInventoryEngine.initializeProductStock(draft, product.id, initialStock, 'u1')
    })
    return inventoryRepository.snapshot().products.find((row) => row.id === product.id) ?? product
  },
  async updateProduct(productId: string, updated: InventoryState['products'][number]) {
    if (isPersistentInventory) await inventoryRepository.updateProduct(productId, updated as unknown as Record<string, unknown>)
    else inventoryRepository.transact((draft) => {
      const index = draft.products.findIndex((product) => product.id === productId)
      if (index >= 0) draft.products[index] = updated
    })
    return inventoryRepository.snapshot().products.find((row) => row.id === productId) ?? null
  },
  async advanceReceipt(receiptId: string) {
    if (!isPersistentInventory) return inventoryRepository.transact((draft) => domainInventoryEngine.advanceReceipt(draft, receiptId))
    const state = inventoryRepository.snapshot()
    const receipt = state.receipts.find((row) => row.id === receiptId)
    if (!receipt) return null
    if (receipt.status === 'ready') {
      domainInventoryEngine.receive(structuredClone(state), receiptId)
      await inventoryRepository.validateReceipt(receiptId)
    } else {
      const next = domainInventoryEngine.advanceReceipt(structuredClone(state), receiptId)
      if (next) await inventoryRepository.setDocumentStatus('receipt', receiptId, next.status)
    }
    return inventoryRepository.snapshot().receipts.find((row) => row.id === receiptId) ?? null
  },
  async cancelReceipt(receiptId: string) {
    if (!isPersistentInventory) return inventoryRepository.transact((draft) => domainInventoryEngine.cancelReceipt(draft, receiptId))
    await inventoryRepository.setDocumentStatus('receipt', receiptId, 'canceled')
    return inventoryRepository.snapshot().receipts.find((row) => row.id === receiptId) ?? null
  },
  async advanceDelivery(deliveryId: string) {
    if (!isPersistentInventory) return inventoryRepository.transact((draft) => domainInventoryEngine.advanceDelivery(draft, deliveryId))
    const delivery = inventoryRepository.snapshot().deliveries.find((row) => row.id === deliveryId)
    if (!delivery) return null
    if (delivery.status === 'ready') {
      domainInventoryEngine.deliver(structuredClone(inventoryRepository.snapshot()), deliveryId)
      await inventoryRepository.validateDelivery(deliveryId)
    } else if (delivery.status === 'draft') await this.pickDelivery(deliveryId)
    else if (delivery.status === 'waiting') await this.packDelivery(deliveryId)
    return inventoryRepository.snapshot().deliveries.find((row) => row.id === deliveryId) ?? null
  },
  async pickDelivery(deliveryId: string) {
    if (!isPersistentInventory) return inventoryRepository.transact((draft) => domainInventoryEngine.pickDelivery(draft, deliveryId))
    domainInventoryEngine.pickDelivery(structuredClone(inventoryRepository.snapshot()), deliveryId)
    await inventoryRepository.pickDelivery(deliveryId)
    return inventoryRepository.snapshot().deliveries.find((row) => row.id === deliveryId) ?? null
  },
  async packDelivery(deliveryId: string) {
    if (!isPersistentInventory) return inventoryRepository.transact((draft) => domainInventoryEngine.packDelivery(draft, deliveryId))
    domainInventoryEngine.packDelivery(structuredClone(inventoryRepository.snapshot()), deliveryId)
    await inventoryRepository.packDelivery(deliveryId)
    return inventoryRepository.snapshot().deliveries.find((row) => row.id === deliveryId) ?? null
  },
  async cancelDelivery(deliveryId: string) {
    if (!isPersistentInventory) return inventoryRepository.transact((draft) => domainInventoryEngine.cancelDelivery(draft, deliveryId))
    await inventoryRepository.setDocumentStatus('delivery', deliveryId, 'canceled')
    return inventoryRepository.snapshot().deliveries.find((row) => row.id === deliveryId) ?? null
  },
  async advanceTransfer(transferId: string) {
    if (!isPersistentInventory) return inventoryRepository.transact((draft) => domainInventoryEngine.advanceTransfer(draft, transferId))
    const state = inventoryRepository.snapshot()
    const transfer = state.transfers.find((row) => row.id === transferId)
    if (!transfer) return null
    if (transfer.status === 'ready') {
      domainInventoryEngine.transfer(structuredClone(state), transferId)
      await inventoryRepository.validateTransfer(transferId)
    } else {
      const next = domainInventoryEngine.advanceTransfer(structuredClone(state), transferId)
      if (next) await inventoryRepository.setDocumentStatus('transfer', transferId, next.status)
    }
    return inventoryRepository.snapshot().transfers.find((row) => row.id === transferId) ?? null
  },
  async cancelTransfer(transferId: string) {
    if (!isPersistentInventory) return inventoryRepository.transact((draft) => domainInventoryEngine.cancelTransfer(draft, transferId))
    await inventoryRepository.setDocumentStatus('transfer', transferId, 'canceled')
    return inventoryRepository.snapshot().transfers.find((row) => row.id === transferId) ?? null
  },
  async applyAdjustment(adjustmentId: string) {
    if (!isPersistentInventory) return inventoryRepository.transact((draft) => {
      const adjustment = draft.adjustments.find((item) => item.id === adjustmentId)
      if (!adjustment || adjustment.status === 'applied') return null
      domainInventoryEngine.adjust(draft, adjustmentId)
      return adjustment
    })
    domainInventoryEngine.adjust(structuredClone(inventoryRepository.snapshot()), adjustmentId)
    await inventoryRepository.applyAdjustment(adjustmentId)
    return inventoryRepository.snapshot().adjustments.find((row) => row.id === adjustmentId) ?? null
  },
}
