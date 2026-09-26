import { describe, expect, it, beforeEach } from 'vitest'
import { receiptService } from '../services/receiptService'
import { deliveryService } from '../services/deliveryService'
import { transferService } from '../services/transferService'
import { adjustmentService } from '../services/adjustmentService'
import { productService } from '../services/productService'
import { getState, resetState, updateState } from '../services/store'
import { inventoryService } from '../services/inventoryService'

describe('inventory workflows', () => {
  beforeEach(() => {
    resetState()
  })

  it('validating a ready receipt increases stock', async () => {
    const receipt = getState().receipts.find((r) => r.id === 'r2')!
    expect(receipt).toBeTruthy()
    const line = receipt!.lines[0]
    const stockBefore = getState().stockItems.find((s) => s.productId === line.productId && s.locationId === line.locationId)!.onHand

    await receiptService.advanceStatus('r2')

    const stockAfter = getState().stockItems.find((s) => s.productId === line.productId && s.locationId === line.locationId)!.onHand
    expect(stockAfter).toBe(stockBefore + line.receivedQuantity)
    expect(getState().moveHistory[0].reference).toBe(receipt.receiptNumber)
    expect(getState().moveHistory.filter((entry) => entry.reference === receipt.receiptNumber)).toHaveLength(1)
    expect(getState().receipts.find((row) => row.id === receipt.id)?.status).toBe('done')
  })

  it('delivery cannot complete when requested exceeds available', async () => {
    resetState()
    updateState((draft) => { draft.deliveries.find((row) => row.id === 'd1')!.lines[0].requestedQuantity = 999999 })
    const canFulfill = await deliveryService.canFulfillDelivery('d1')
    expect(canFulfill).toBe(false)
  })

  it('delivery readiness accounts for duplicate product lines together', async () => {
    updateState((draft) => {
      const delivery = draft.deliveries.find((row) => row.id === 'd2')!
      delivery.lines.push({ id: 'dl-extra', productId: 'p5', requestedQuantity: 41, pickedQuantity: 0, packedQuantity: 0 })
    })
    expect(await deliveryService.canFulfillDelivery('d2')).toBe(false)
  })

  it('internal transfer keeps global stock total unchanged after done', async () => {
    const totalBefore = getState().stockItems.reduce((sum, row) => sum + row.onHand, 0)
    await transferService.advanceStatus('t1')
    const totalAfter = getState().stockItems.reduce((sum, row) => sum + row.onHand, 0)
    expect(totalAfter).toBe(totalBefore)
    expect(getState().moveHistory[0].operation).toBe('Internal Transfer')
  })

  it('delivery subtracts only available units across locations and records a ledger entry', async () => {
    const before = getState().stockItems.filter((row) => row.productId === 'p5' && row.warehouseId === 'w2').reduce((sum, row) => sum + row.onHand, 0)
    await deliveryService.advanceStatus('d2')
    const after = getState().stockItems.filter((row) => row.productId === 'p5' && row.warehouseId === 'w2').reduce((sum, row) => sum + row.onHand, 0)
    expect(after).toBe(before - 10)
    expect(getState().moveHistory[0].operation).toBe('Delivery')
    expect(getState().moveHistory.filter((entry) => entry.reference === getState().deliveries.find((row) => row.id === 'd2')?.deliveryNumber)).toHaveLength(1)
    expect(getState().deliveries.find((row) => row.id === 'd2')?.status).toBe('done')
  })

  it('failed delivery leaves stock, status, and ledger unchanged', async () => {
    updateState((draft) => { draft.deliveries.find((row) => row.id === 'd2')!.lines[0].requestedQuantity = 999999 })
    const stockBefore = getState().stockItems.map((row) => row.onHand)
    const ledgerBefore = getState().moveHistory.length
    await expect(deliveryService.advanceStatus('d2')).rejects.toThrow(/available/)
    expect(getState().stockItems.map((row) => row.onHand)).toEqual(stockBefore)
    expect(getState().moveHistory).toHaveLength(ledgerBefore)
    expect(getState().deliveries.find((row) => row.id === 'd2')?.status).toBe('ready')
  })

  it('transfer moves quantity between its locations without changing the total', async () => {
    const before = getState().stockItems.find((row) => row.productId === 'p1' && row.locationId === 'l1')!.onHand
    await transferService.advanceStatus('t1')
    const source = getState().stockItems.find((row) => row.productId === 'p1' && row.locationId === 'l1')!
    const destination = getState().stockItems.find((row) => row.productId === 'p1' && row.locationId === 'l4')!
    expect(source.onHand).toBe(before - 50)
    expect(destination.onHand).toBe(50)
  })

  it('rejects an overdrawn transfer atomically', async () => {
    updateState((draft) => { draft.transfers.find((row) => row.id === 't1')!.lines[0].quantity = 999999 })
    const before = getState().stockItems.map((row) => row.onHand)
    await expect(transferService.advanceStatus('t1')).rejects.toThrow(/available/)
    expect(getState().stockItems.map((row) => row.onHand)).toEqual(before)
    expect(getState().transfers.find((row) => row.id === 't1')!.status).toBe('ready')
  })

  it('writes one ledger event for a successful transfer', async () => {
    await transferService.advanceStatus('t1')
    expect(getState().moveHistory.filter((entry) => entry.reference === getState().transfers.find((row) => row.id === 't1')?.transferNumber)).toHaveLength(1)
  })

  it('rejects duplicate transfer lines whose combined quantity exceeds available stock', async () => {
    updateState((draft) => {
      const transfer = draft.transfers.find((row) => row.id === 't1')!
      transfer.lines.push({ id: 'tl-extra', productId: 'p1', quantity: 500 })
    })
    const before = getState().stockItems.map((row) => row.onHand)
    await expect(transferService.advanceStatus('t1')).rejects.toThrow(/available/)
    expect(getState().stockItems.map((row) => row.onHand)).toEqual(before)
  })

  it('applies an adjustment difference and creates a ledger entry', async () => {
    const adjustment = await adjustmentService.createAdjustment({
      productId: 'p4', warehouseId: 'w1', locationId: 'l1', systemQuantity: 48,
      countedQuantity: 45, reason: 'Cycle count', createdBy: 'u1', date: new Date().toISOString(),
    })
    await adjustmentService.applyAdjustment(adjustment.id)
    expect(getState().stockItems.find((row) => row.id === 's4')!.onHand).toBe(45)
    expect(getState().moveHistory[0].quantity).toBe(-3)
    expect(getState().moveHistory[0].operation).toBe('Adjustment')
    expect(getState().moveHistory.filter((entry) => entry.reference === adjustment.adjustmentNumber)).toHaveLength(1)
  })

  it('records positive adjustments once and zero adjustments without a stock ledger mutation', async () => {
    const positive = await adjustmentService.createAdjustment({
      productId: 'p4', warehouseId: 'w1', locationId: 'l1', systemQuantity: 48,
      countedQuantity: 53, reason: 'Count increase', createdBy: 'u1', date: new Date().toISOString(),
    })
    await adjustmentService.applyAdjustment(positive.id)
    expect(getState().stockItems.find((row) => row.id === 's4')?.onHand).toBe(53)
    expect(getState().moveHistory.filter((entry) => entry.reference === positive.adjustmentNumber)).toHaveLength(1)

    const zero = await adjustmentService.createAdjustment({
      productId: 'p4', warehouseId: 'w1', locationId: 'l1', systemQuantity: 53,
      countedQuantity: 53, reason: 'Verified count', createdBy: 'u1', date: new Date().toISOString(),
    })
    const ledgerCount = getState().moveHistory.length
    await adjustmentService.applyAdjustment(zero.id)
    expect(getState().stockItems.find((row) => row.id === 's4')?.onHand).toBe(53)
    expect(getState().moveHistory).toHaveLength(ledgerCount + 1)
    expect(getState().moveHistory[0]).toMatchObject({ reference: zero.adjustmentNumber, quantity: 0 })
    expect(getState().adjustments.find((row) => row.id === zero.id)?.status).toBe('applied')
  })

  it('canceled operations do not create stock mutation ledger entries', async () => {
    const before = getState().moveHistory.length
    await receiptService.cancelReceipt('r1')
    await deliveryService.cancelDelivery('d1')
    await transferService.cancelTransfer('t2')
    expect(getState().moveHistory).toHaveLength(before)
  })

  it('dashboard metrics reflect completed and canceled operations', async () => {
    const before = await inventoryService.getDashboardMetrics()
    await receiptService.advanceStatus('r2')
    await deliveryService.cancelDelivery('d1')
    const after = await inventoryService.getDashboardMetrics()
    expect(after.pendingReceipts).toBe(before.pendingReceipts - 1)
    expect(after.pendingDeliveries).toBe(before.pendingDeliveries - 1)
  })

  it('stock alerts change when availability crosses a reorder threshold', async () => {
    const beforeAlerts = await inventoryService.getStockAlerts()
    expect(beforeAlerts.some((row) => row.productId === 'p1' && row.locationId === 'l1')).toBe(false)
    const adjustment = await adjustmentService.createAdjustment({
      productId: 'p1', warehouseId: 'w1', locationId: 'l1', systemQuantity: 460,
      countedQuantity: 50, reason: 'Cycle count', createdBy: 'u1', date: new Date().toISOString(),
    })
    await adjustmentService.applyAdjustment(adjustment.id)
    const afterAlerts = await inventoryService.getStockAlerts()
    expect(afterAlerts.some((row) => row.productId === 'p1' && row.locationId === 'l1')).toBe(true)
  })

  it('records product initial stock through the transaction engine', async () => {
    const product = await productService.createProduct({
      name: 'Test stock item', sku: 'TEST-001', categoryId: 'c1', unit: 'pcs', initialStock: 7,
      reorderPoint: 1, defaultWarehouseId: 'w1', defaultLocationId: 'l1',
    })
    expect(getState().stockItems.find((row) => row.productId === product.id)?.onHand).toBe(7)
    expect(getState().moveHistory[0]).toMatchObject({ operation: 'Adjustment', reference: product.sku, quantity: 7 })
  })
})
