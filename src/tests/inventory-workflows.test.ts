import { describe, expect, it, beforeEach } from 'vitest'
import { receiptService } from '../services/receiptService'
import { deliveryService } from '../services/deliveryService'
import { transferService } from '../services/transferService'
import { adjustmentService } from '../services/adjustmentService'
import { getState, resetState, updateState } from '../services/store'

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
  })

  it('delivery cannot complete when requested exceeds available', async () => {
    resetState()
    updateState((draft) => { draft.deliveries.find((row) => row.id === 'd1')!.lines[0].requestedQuantity = 999999 })
    const canFulfill = await deliveryService.canFulfillDelivery('d1')
    expect(canFulfill).toBe(false)
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
    await expect(transferService.advanceStatus('t1')).rejects.toThrow(/Not enough available stock/)
    expect(getState().stockItems.map((row) => row.onHand)).toEqual(before)
    expect(getState().transfers.find((row) => row.id === 't1')!.status).toBe('ready')
  })

  it('rejects duplicate transfer lines whose combined quantity exceeds available stock', async () => {
    updateState((draft) => {
      const transfer = draft.transfers.find((row) => row.id === 't1')!
      transfer.lines.push({ id: 'tl-extra', productId: 'p1', quantity: 500 })
    })
    const before = getState().stockItems.map((row) => row.onHand)
    await expect(transferService.advanceStatus('t1')).rejects.toThrow(/Not enough available stock/)
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
  })
})
