import { beforeEach, describe, expect, it } from 'vitest'
import { resetState } from '../services/store'
import { receiptService } from '../services/receiptService'
import { transferService } from '../services/transferService'
import { warehouseService } from '../services/warehouseService'
import { locationService } from '../services/locationService'
import { reorderingRuleService } from '../services/reorderingRuleService'
import { inventoryService } from '../services/inventoryService'
import { inventoryRepository } from '../services/inventoryRepository'

describe('inventory-backed views', () => {
  beforeEach(() => resetState())

  it('warehouse totals update after a receipt is validated', async () => {
    const before = (await warehouseService.getWarehouses()).find((row) => row.id === 'w1')!.totalUnits
    await receiptService.advanceStatus('r2')
    const after = (await warehouseService.getWarehouses()).find((row) => row.id === 'w1')!.totalUnits
    expect(after).toBe(before + 50)
  })

  it('location quantities update at both ends of an internal transfer', async () => {
    const before = await locationService.getLocations()
    const sourceBefore = before.find((row) => row.id === 'l1')!.stockCount
    const destinationBefore = before.find((row) => row.id === 'l4')!.stockCount
    await transferService.advanceStatus('t1')
    const after = await locationService.getLocations()
    expect(after.find((row) => row.id === 'l1')!.stockCount).toBe(sourceBefore - 50)
    expect(after.find((row) => row.id === 'l4')!.stockCount).toBe(destinationBefore + 50)
  })

  it('reordering status and dashboard alerts follow available quantity', async () => {
    const update = (onHand: number) => inventoryRepository.transact((state) => {
      state.stockItems.find((row) => row.productId === 'p7' && row.locationId === 'l4')!.onHand = onHand
    })
    update(50)
    expect((await reorderingRuleService.getRules()).find((row) => row.productId === 'p7')?.status).toBe('Healthy')
    update(12)
    const rule = (await reorderingRuleService.getRules()).find((row) => row.productId === 'p7')
    expect(rule).toMatchObject({ currentQty: 8, status: 'Critical' })
    expect((await inventoryService.getStockAlerts()).some((row) => row.productId === 'p7' && row.status === 'Critical')).toBe(true)
  })
})
