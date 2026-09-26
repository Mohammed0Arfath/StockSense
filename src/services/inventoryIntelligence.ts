import type { InventoryState, MoveHistoryEntry, Product, ReorderingRule } from '../types/domain'
import { aggregateProductStock, availableQty } from '../utils/inventory'

export type HealthStatus = 'Healthy' | 'Attention' | 'Critical'
export interface InventoryHealthInsight {
  product: Product
  status: HealthStatus
  available: number
  reason: string
  href: string
}
export interface ReorderInsight {
  product: Product
  warehouseName: string
  locationName: string
  locationId: string
  available: number
  reorderPoint: number
  maxQuantity: number
  suggestedQuantity: number
  reason: string
  href: string
}
export interface StockRiskInsight {
  id: string
  title: string
  reason: string
  href: string
  severity: 'Critical' | 'Attention'
}
export interface OperationalInsight {
  id: string
  title: string
  reason: string
  href: string
}

const DAY = 24 * 60 * 60 * 1000
const recent = (timestamp: string, now: number) => now - new Date(timestamp).getTime() <= 30 * DAY && new Date(timestamp).getTime() <= now

export const calculateReorderQuantity = (current: number, maximum: number) => Math.max(0, maximum - current)

export const getInventoryHealth = (state: InventoryState, now = Date.now()): InventoryHealthInsight[] =>
  state.products.map((product) => {
    const totals = aggregateProductStock(product, state.stockItems)
    const rules = state.reorderingRules.filter((rule) => rule.productId === product.id)
    const threshold = rules.length ? Math.max(...rules.map((rule) => rule.minQty)) : product.reorderPoint
    const adjustmentCount = state.moveHistory.filter((move) => move.productId === product.id && move.operation === 'Adjustment' && recent(move.timestamp, now)).length
    const lowLocation = rules.find((rule) => {
      const stock = state.stockItems.find((item) => item.productId === product.id && item.locationId === rule.locationId && item.warehouseId === rule.warehouseId)
      return (stock ? availableQty(stock) : 0) <= rule.minQty
    })
    let status: HealthStatus = 'Healthy'
    let reason = `Available stock (${totals.available}) is above the reorder point (${threshold}).`
    if (totals.available <= 0 || (lowLocation && lowLocation.minQty > 0 && (state.stockItems.find((item) => item.productId === product.id && item.locationId === lowLocation.locationId && item.warehouseId === lowLocation.warehouseId)?.onHand ?? 0) - (state.stockItems.find((item) => item.productId === product.id && item.locationId === lowLocation.locationId && item.warehouseId === lowLocation.warehouseId)?.reserved ?? 0) <= lowLocation.minQty / 2)) {
      status = 'Critical'
      reason = totals.available <= 0
        ? 'Critical because available stock is zero.'
        : `Critical because available stock at ${state.locations.find((location) => location.id === lowLocation?.locationId)?.name ?? 'a tracked location'} is below half its reorder point (${lowLocation?.minQty}).`
    } else if (lowLocation) {
      status = 'Attention'
      const location = state.locations.find((row) => row.id === lowLocation.locationId)
      const stock = state.stockItems.find((item) => item.productId === product.id && item.locationId === lowLocation.locationId && item.warehouseId === lowLocation.warehouseId)
      reason = `Attention because available quantity (${stock ? availableQty(stock) : 0}) at ${location?.name ?? 'a tracked location'} is below reorder point (${lowLocation.minQty}).`
    } else if (totals.available <= threshold) {
      status = totals.available === 0 ? 'Critical' : 'Attention'
      reason = `${status} because available stock (${totals.available}) is ${totals.available === 0 ? 'zero' : `at or below reorder point (${threshold})`}.`
    }
    if (status === 'Healthy' && adjustmentCount >= 3) {
      status = 'Attention'
      reason = `Attention because ${adjustmentCount} stock adjustments were recorded in the last 30 days.`
    }
    return { product, status, available: totals.available, reason, href: `/products/${product.id}` }
  })

export const getReorderInsights = (state: InventoryState): ReorderInsight[] => state.reorderingRules.flatMap((rule: ReorderingRule) => {
  const product = state.products.find((row) => row.id === rule.productId)
  const warehouse = state.warehouses.find((row) => row.id === rule.warehouseId)
  const location = state.locations.find((row) => row.id === rule.locationId)
  if (!product || !warehouse || !location) return []
  const stock = state.stockItems.find((row) => row.productId === rule.productId && row.warehouseId === rule.warehouseId && row.locationId === rule.locationId)
  const current = stock ? availableQty(stock) : 0
  if (current > rule.minQty) return []
  const suggestedQuantity = calculateReorderQuantity(current, rule.maxQty)
  return [{ product, warehouseName: warehouse.name, locationName: location.name, locationId: location.id, available: current, reorderPoint: rule.minQty, maxQuantity: rule.maxQty, suggestedQuantity, reason: `Available quantity (${current}) is at or below the reorder point (${rule.minQty}); suggested quantity fills stock to the rule maximum (${rule.maxQty}).`, href: `/locations/${location.id}` }]
})

export const getStockRiskInsights = (state: InventoryState, now = Date.now()): StockRiskInsight[] => {
  const insights: StockRiskInsight[] = []
  const health = getInventoryHealth(state, now)
  for (const item of health) {
    if (item.status === 'Critical') insights.push({ id: `critical:${item.product.id}`, title: `Critical: ${item.product.name}`, reason: item.reason, href: item.href, severity: 'Critical' })
    else if (item.available > 0 && item.status === 'Attention') insights.push({ id: `low:${item.product.id}`, title: `Low stock: ${item.product.name}`, reason: item.reason, href: item.href, severity: 'Attention' })
    if (item.available <= 0) insights.push({ id: `out:${item.product.id}`, title: `Out of stock: ${item.product.name}`, reason: 'No available units remain across tracked stock.', href: item.href, severity: 'Critical' })
  }
  for (const product of state.products) {
    const adjustments = state.moveHistory.filter((move) => move.productId === product.id && move.operation === 'Adjustment' && recent(move.timestamp, now))
    if (adjustments.length >= 3) insights.push({ id: `adjustments:${product.id}`, title: `Repeated adjustments: ${product.name}`, reason: `${adjustments.length} adjustments were recorded in the last 30 days.`, href: adjustments[0].documentId ? `/adjustments/${adjustments[0].documentId}` : '/adjustments', severity: 'Attention' })
  }
  for (const rule of state.reorderingRules) {
    const stock = state.stockItems.find((row) => row.productId === rule.productId && row.warehouseId === rule.warehouseId && row.locationId === rule.locationId)
    const current = stock ? availableQty(stock) : 0
    if (current <= rule.minQty) {
      const product = state.products.find((row) => row.id === rule.productId)
      const location = state.locations.find((row) => row.id === rule.locationId)
      insights.push({ id: `location:${rule.id}`, title: `Low availability: ${location?.name ?? 'Location'}`, reason: `${product?.name ?? 'Tracked stock'} has ${current} available; the location reorder point is ${rule.minQty}.`, href: `/locations/${rule.locationId}`, severity: current <= rule.minQty / 2 ? 'Critical' : 'Attention' })
    }
  }
  return insights
}

export const getOperationalInsights = (state: InventoryState, now = Date.now()): OperationalInsight[] => {
  const pending = [
    ...state.receipts.filter((row) => !['done', 'canceled'].includes(row.status)).map((row) => ({ id: row.id, title: `Pending receipt ${row.receiptNumber}`, reason: `${row.status} from ${row.vendor}.`, href: `/receipts/${row.id}` })),
    ...state.deliveries.filter((row) => !['done', 'canceled'].includes(row.status)).map((row) => ({ id: row.id, title: `Pending delivery ${row.deliveryNumber}`, reason: `${row.status} for ${row.customer}.`, href: `/deliveries/${row.id}` })),
    ...state.transfers.filter((row) => !['done', 'canceled'].includes(row.status)).map((row) => ({ id: row.id, title: `Pending transfer ${row.transferNumber}`, reason: `${row.status}; awaiting completion between the selected locations.`, href: `/transfers/${row.id}` })),
  ]
  const adjustmentInsights = state.moveHistory.filter((row: MoveHistoryEntry) => row.operation === 'Adjustment' && recent(row.timestamp, now)).slice(0, 5).map((row) => ({ id: `move:${row.id}`, title: `Stock adjustment: ${row.sku}`, reason: `${row.quantity > 0 ? '+' : ''}${row.quantity} units recorded in ${row.reference}.`, href: row.documentId ? `/adjustments/${row.documentId}` : '/move-history' }))
  const unusual = state.moveHistory.filter((row) => {
    const product = state.products.find((item) => item.id === row.productId)
    return product && Math.abs(row.quantity) >= Math.max(product.reorderPoint, 1) && recent(row.timestamp, now)
  }).slice(0, 5).map((row) => ({ id: `unusual:${row.id}`, title: `Large stock movement: ${row.sku}`, reason: `${row.operation} changed stock by ${row.quantity > 0 ? '+' : ''}${row.quantity} units.`, href: row.documentId ? `/${row.operation === 'Receipt' ? 'receipts' : row.operation === 'Delivery' ? 'deliveries' : row.operation === 'Internal Transfer' ? 'transfers' : 'adjustments'}/${row.documentId}` : '/move-history' }))
  return [...pending, ...adjustmentInsights, ...unusual]
}
