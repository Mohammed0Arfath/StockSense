import { beforeEach, describe, expect, it } from 'vitest'
import { initialInventoryState } from '../data/mockData'
import { inventoryRepository } from '../services/inventoryRepository'
import { calculateReorderQuantity, getInventoryHealth, getOperationalInsights, getReorderInsights, getStockRiskInsights } from '../services/inventoryIntelligence'
import { resetState } from '../services/store'

const NOW = new Date('2026-09-26T12:00:00.000Z').getTime()
const recentAt = new Date(NOW - 2 * 24 * 60 * 60 * 1000).toISOString()

describe('StockSense intelligence rules', () => {
  beforeEach(() => resetState())

  it('classifies healthy, attention, and critical products with explainable reasons', () => {
    const state = structuredClone(initialInventoryState)
    state.stockItems.find((row) => row.productId === 'p1')!.onHand = 500
    state.stockItems.find((row) => row.productId === 'p2')!.onHand = 50
    state.stockItems.find((row) => row.productId === 'p7')!.onHand = 8
    const health = getInventoryHealth(state, NOW)
    expect(health.find((row) => row.product.id === 'p1')).toMatchObject({ status: 'Healthy' })
    expect(health.find((row) => row.product.id === 'p2')).toMatchObject({ status: 'Attention' })
    expect(health.find((row) => row.product.id === 'p2')?.reason).toContain('reorder point')
    expect(health.find((row) => row.product.id === 'p7')).toMatchObject({ status: 'Critical' })
    expect(health.find((row) => row.product.id === 'p7')?.reason).toContain('Critical')
  })

  it('calculates deterministic quantities needed to reach the rule maximum', () => {
    expect(calculateReorderQuantity(18, 100)).toBe(82)
    expect(calculateReorderQuantity(110, 100)).toBe(0)
    const suggestions = getReorderInsights(initialInventoryState)
    expect(suggestions.find((row) => row.product.id === 'p7')).toMatchObject({ available: 8, reorderPoint: 20, suggestedQuantity: 52, locationId: 'l4' })
  })

  it('detects critical, low, out-of-stock, adjustment, and low-location risks', () => {
    const state = structuredClone(initialInventoryState)
    state.stockItems.find((row) => row.productId === 'p1')!.onHand = 0
    state.stockItems.find((row) => row.productId === 'p6')!.onHand = 30
    state.stockItems.find((row) => row.productId === 'p3')!.onHand = 0
    state.moveHistory.push(...[1, 2, 3].map((id) => ({ id: `adj-${id}`, timestamp: recentAt, reference: `ADJ-${id}`, operation: 'Adjustment' as const, productId: 'p1', sku: 'STL-ROD-001', source: 'A', destination: 'A', quantity: -1, user: 'Test', status: 'Applied' })))
    const risks = getStockRiskInsights(state, NOW)
    expect(risks.some((risk) => risk.id === 'critical:p1')).toBe(true)
    expect(risks.some((risk) => risk.id === 'out:p1')).toBe(true)
    expect(risks.some((risk) => risk.id === 'low:p6')).toBe(true)
    expect(risks.some((risk) => risk.id === 'adjustments:p1' && risk.reason.includes('3 adjustments'))).toBe(true)
    expect(risks.some((risk) => risk.id === 'location:rr3' && risk.href === '/locations/l4')).toBe(true)
  })

  it('limits repeated-adjustment health and risk to the prior 30 days', () => {
    const state = structuredClone(initialInventoryState)
    state.stockItems.find((row) => row.productId === 'p1')!.onHand = 500
    state.moveHistory.push(...[1, 2, 3].map((id) => ({ id: `old-adj-${id}`, timestamp: new Date(NOW - 31 * 24 * 60 * 60 * 1000).toISOString(), reference: `OLD-${id}`, operation: 'Adjustment' as const, productId: 'p1', sku: 'STL-ROD-001', source: 'A', destination: 'A', quantity: -1, user: 'Test', status: 'Applied' })))
    expect(getInventoryHealth(state, NOW).find((row) => row.product.id === 'p1')?.status).toBe('Healthy')
    expect(getStockRiskInsights(state, NOW).some((risk) => risk.id === 'adjustments:p1')).toBe(false)
  })

  it('derives operational insights from existing documents and movement history', () => {
    const insights = getOperationalInsights(initialInventoryState, NOW)
    expect(insights.some((item) => item.title.includes('REC-2026-001') && item.href === '/receipts/r1')).toBe(true)
    expect(insights.some((item) => item.title.includes('DEL-2026-001') && item.href === '/deliveries/d1')).toBe(true)
    expect(insights.some((item) => item.title.includes('TRF-2026-001') && item.href === '/transfers/t1')).toBe(true)
    expect(insights.some((item) => item.title.includes('Stock adjustment'))).toBe(true)
  })

  it('reflects persisted repository state rather than separate dashboard numbers', () => {
    inventoryRepository.transact((state) => { state.stockItems.find((row) => row.productId === 'p1')!.onHand = 0 })
    const persistedSnapshot = inventoryRepository.snapshot()
    expect(getInventoryHealth(persistedSnapshot, NOW).find((row) => row.product.id === 'p1')).toMatchObject({ status: 'Critical', available: 0 })
  })
})
