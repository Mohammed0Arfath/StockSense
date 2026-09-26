import type { InventoryState, StockItem } from '../types/domain'
import { getLocationName, getUserName, getWarehouseName } from './helpers'

export class InventoryOperationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InventoryOperationError'
  }
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

const findStock = (state: InventoryState, productId: string, warehouseId: string, locationId: string) =>
  state.stockItems.find((row) => row.productId === productId && row.warehouseId === warehouseId && row.locationId === locationId)

const ensureStock = (state: InventoryState, productId: string, warehouseId: string, locationId: string): StockItem => {
  const existing = findStock(state, productId, warehouseId, locationId)
  if (existing) return existing
  const stock: StockItem = { id: `s-${crypto.randomUUID()}`, productId, warehouseId, locationId, onHand: 0, reserved: 0 }
  state.stockItems.push(stock)
  return stock
}

const addLedgerEntry = (state: InventoryState, entry: Omit<InventoryState['moveHistory'][number], 'id' | 'timestamp'>) => {
  state.moveHistory.unshift({ ...entry, id: `m-${crypto.randomUUID()}`, timestamp: new Date().toISOString() })
}

export const inventoryEngine = {
  receive(state: InventoryState, receiptId: string) {
    const receipt = state.receipts.find((row) => row.id === receiptId)
    if (!receipt) throw new InventoryOperationError('Receipt not found.')
    if (receipt.status !== 'ready') throw new InventoryOperationError('Only a ready receipt can be validated.')
    if (!receipt.lines.length) throw new InventoryOperationError('Add at least one product before validating this receipt.')
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
      addLedgerEntry(state, { reference: receipt.receiptNumber, operation: 'Receipt', productId: product.id, sku: product.sku, source: receipt.vendor, destination: `${getWarehouseName(receipt.warehouseId)} / ${location.name}`, quantity, user: getUserName(receipt.createdBy), status: 'Done' })
    }
    receipt.status = 'done'
  },

  deliver(state: InventoryState, deliveryId: string) {
    const delivery = state.deliveries.find((row) => row.id === deliveryId)
    if (!delivery) throw new InventoryOperationError('Delivery not found.')
    if (delivery.status !== 'ready') throw new InventoryOperationError('Only a ready delivery can be validated.')
    if (!delivery.lines.length) throw new InventoryOperationError('Add at least one product before validating this delivery.')
    const requestedByProduct = new Map<string, number>()
    for (const line of delivery.lines) {
      requireQuantity(line.requestedQuantity, 'Delivery quantity')
      if (line.requestedQuantity === 0) throw new InventoryOperationError('Delivery quantity must be greater than zero.')
      requestedByProduct.set(line.productId, (requestedByProduct.get(line.productId) ?? 0) + line.requestedQuantity)
    }
    for (const [productId, requested] of requestedByProduct) {
      const product = requireProduct(state, productId)
      const available = state.stockItems
        .filter((row) => row.productId === productId && row.warehouseId === delivery.sourceWarehouseId)
        .reduce((sum, row) => sum + Math.max(row.onHand - row.reserved, 0), 0)
      if (available < requested) throw new InventoryOperationError(`Not enough available stock for ${product.name}.`)
    }
    const planned = delivery.lines.map((line) => {
      requireProduct(state, line.productId)
      const rows = state.stockItems.filter((row) => row.productId === line.productId && row.warehouseId === delivery.sourceWarehouseId)
      return { line, rows }
    })
    for (const { line, rows } of planned) {
      let remaining = line.requestedQuantity
      for (const stock of rows) {
        const quantity = Math.min(remaining, Math.max(stock.onHand - stock.reserved, 0))
        stock.onHand -= quantity
        remaining -= quantity
        if (!remaining) break
      }
      const product = requireProduct(state, line.productId)
      const sourceNames = [...new Set(rows.map((row) => getLocationName(row.locationId)))].join(', ')
      addLedgerEntry(state, { reference: delivery.deliveryNumber, operation: 'Delivery', productId: product.id, sku: product.sku, source: `${getWarehouseName(delivery.sourceWarehouseId)} / ${sourceNames}`, destination: delivery.customer, quantity: -line.requestedQuantity, user: getUserName(delivery.createdBy), status: 'Done' })
    }
    delivery.status = 'done'
  },

  transfer(state: InventoryState, transferId: string) {
    const transfer = state.transfers.find((row) => row.id === transferId)
    if (!transfer) throw new InventoryOperationError('Transfer not found.')
    if (transfer.status !== 'ready') throw new InventoryOperationError('Only a ready transfer can be validated.')
    if (transfer.sourceWarehouseId === transfer.destinationWarehouseId && transfer.sourceLocationId === transfer.destinationLocationId) throw new InventoryOperationError('Source and destination must be different locations.')
    const sourceLocation = requireLocation(state, transfer.sourceLocationId, transfer.sourceWarehouseId)
    const destinationLocation = requireLocation(state, transfer.destinationLocationId, transfer.destinationWarehouseId)
    if (!transfer.lines.length) throw new InventoryOperationError('Add at least one product before validating this transfer.')
    const requestedByProduct = new Map<string, number>()
    for (const line of transfer.lines) {
      requireQuantity(line.quantity, 'Transfer quantity')
      if (line.quantity === 0) throw new InventoryOperationError('Transfer quantity must be greater than zero.')
      requestedByProduct.set(line.productId, (requestedByProduct.get(line.productId) ?? 0) + line.quantity)
    }
    for (const [productId, requested] of requestedByProduct) {
      const product = requireProduct(state, productId)
      const source = findStock(state, productId, transfer.sourceWarehouseId, sourceLocation.id)
      if (!source || source.onHand - source.reserved < requested) throw new InventoryOperationError(`Not enough available stock for ${product.name} at ${sourceLocation.name}.`)
    }
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
      addLedgerEntry(state, { reference: transfer.transferNumber, operation: 'Internal Transfer', productId: product.id, sku: product.sku, source: `${getWarehouseName(transfer.sourceWarehouseId)} / ${sourceLocation.name}`, destination: `${getWarehouseName(transfer.destinationWarehouseId)} / ${destinationLocation.name}`, quantity: line.quantity, user: 'System', status: 'Done' })
    }
    transfer.status = 'done'
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
    addLedgerEntry(state, { reference: adjustment.adjustmentNumber, operation: 'Adjustment', productId: product.id, sku: product.sku, source: locationLabel, destination: locationLabel, quantity: difference, user: getUserName(adjustment.createdBy), status: 'Applied' })
  },
}
