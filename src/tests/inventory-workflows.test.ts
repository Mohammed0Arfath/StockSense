import { describe, expect, it, beforeEach } from 'vitest'
import { receiptService } from '../services/receiptService'
import { deliveryService } from '../services/deliveryService'
import { transferService } from '../services/transferService'
import { getState, resetState } from '../services/store'

describe('inventory workflows', () => {
  beforeEach(() => {
    resetState()
  })

  it('validating a ready receipt increases stock', async () => {
    const receipt = getState().receipts.find((r) => r.id === 'r2')
    expect(receipt).toBeTruthy()
    const line = receipt!.lines[0]
    const stockBefore = getState().stockItems.find((s) => s.productId === line.productId && s.locationId === line.locationId)!.onHand

    await receiptService.advanceStatus('r2')

    const stockAfter = getState().stockItems.find((s) => s.productId === line.productId && s.locationId === line.locationId)!.onHand
    expect(stockAfter).toBe(stockBefore + line.receivedQuantity)
  })

  it('delivery cannot complete when requested exceeds available', async () => {
    resetState()
    const delivery = getState().deliveries.find((d) => d.id === 'd1')!
    delivery.lines[0].requestedQuantity = 999999
    const canFulfill = await deliveryService.canFulfillDelivery('d1')
    expect(canFulfill).toBe(false)
  })

  it('internal transfer keeps global stock total unchanged after done', async () => {
    const totalBefore = getState().stockItems.reduce((sum, row) => sum + row.onHand, 0)
    await transferService.advanceStatus('t1')
    const totalAfter = getState().stockItems.reduce((sum, row) => sum + row.onHand, 0)
    expect(totalAfter).toBe(totalBefore)
  })
})
