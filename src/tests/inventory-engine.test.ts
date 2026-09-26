import { beforeEach, describe, expect, it } from 'vitest'
import { initialInventoryState } from '../data/mockData'
import { InventoryOperationError, inventoryEngine } from '../services/inventoryEngine'
import type { InventoryState } from '../types/domain'

describe('inventory transaction engine', () => {
  let state: InventoryState

  beforeEach(() => {
    state = structuredClone(initialInventoryState)
  })

  it('applies a receipt and writes one ledger row per line', () => {
    const receipt = state.receipts.find((row) => row.id === 'r2')!
    const stock = state.stockItems.find((row) => row.productId === 'p6' && row.locationId === 'l1')!
    const before = stock.onHand

    inventoryEngine.receive(state, receipt.id)

    expect(stock.onHand).toBe(before + receipt.lines[0].receivedQuantity)
    expect(receipt.status).toBe('done')
    expect(state.moveHistory[0]).toMatchObject({ reference: receipt.receiptNumber, operation: 'Receipt', quantity: 50 })
  })

  it('rejects a receipt line targeting a location in another warehouse without partial changes', () => {
    const receipt = state.receipts.find((row) => row.id === 'r2')!
    receipt.lines.push({ id: 'invalid-line', productId: 'p1', expectedQuantity: 1, receivedQuantity: 1, unit: 'pcs', locationId: 'l5' })
    const stockBefore = structuredClone(state.stockItems)
    const ledgerBefore = state.moveHistory.length

    expect(() => inventoryEngine.receive(state, receipt.id)).toThrow(InventoryOperationError)
    expect(state.stockItems).toEqual(stockBefore)
    expect(state.moveHistory).toHaveLength(ledgerBefore)
    expect(receipt.status).toBe('ready')
  })

  it('rejects delivery quantities that would consume reserved stock', () => {
    const delivery = state.deliveries.find((row) => row.id === 'd2')!
    delivery.status = 'ready'
    delivery.lines[0].requestedQuantity = 51
    const stockBefore = structuredClone(state.stockItems)

    expect(() => inventoryEngine.deliver(state, delivery.id)).toThrow(/Not enough available stock/)
    expect(state.stockItems).toEqual(stockBefore)
    expect(delivery.status).toBe('ready')
  })
})
