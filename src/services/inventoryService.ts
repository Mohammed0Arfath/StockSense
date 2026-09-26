import { reorderingRuleService } from './reorderingRuleService'
import { inventoryRepository } from './inventoryRepository'
import { aggregateProductStock, stockStatusLabel } from '../utils/inventory'

export const inventoryService = {
  async getDashboardMetrics() {
    const state = inventoryRepository.snapshot()
    const totals = state.products.map((product) => {
      const agg = aggregateProductStock(product, state.stockItems)
      return { product, ...agg }
    })

    return {
      totalProductsInStock: totals.filter((row) => row.available > 0).length,
      lowStock: totals.filter((row) => row.available > 0 && row.available <= row.product.reorderPoint).length,
      outOfStock: totals.filter((row) => row.available <= 0).length,
      pendingReceipts: state.receipts.filter((r) => r.status !== 'done' && r.status !== 'canceled').length,
      pendingDeliveries: state.deliveries.filter((d) => d.status !== 'done' && d.status !== 'canceled').length,
      internalTransfers: state.transfers.filter((t) => t.status !== 'done' && t.status !== 'canceled').length,
      totalStockUnits: state.stockItems.reduce((sum, row) => sum + row.onHand, 0),
    }
  },

  async getStockView() {
    const state = inventoryRepository.snapshot()
    return state.stockItems.map((item) => {
      const product = state.products.find((p) => p.id === item.productId)
      const warehouse = state.warehouses.find((w) => w.id === item.warehouseId)
      const location = state.locations.find((l) => l.id === item.locationId)
      const available = Math.max(item.onHand - item.reserved, 0)
      return {
        ...item,
        product,
        warehouse,
        location,
        available,
        status: stockStatusLabel(available, product?.reorderPoint ?? 0),
      }
    })
  },

  async getStockAlerts() {
    const stock = await this.getStockView()
    const rules = await reorderingRuleService.getRules()
    const ruleKeys = new Set(rules.map((rule) => `${rule.productId}:${rule.locationId}`))
    const ruleAlerts = rules
      .filter((rule) => rule.status !== 'Healthy')
      .map((rule) => {
        const row = stock.find((item) => item.productId === rule.productId && item.locationId === rule.locationId)
        return row ? { ...row, available: rule.currentQty, status: rule.status } : null
      })
      .filter((row) => row !== null)
    const fallbackAlerts = stock.filter((row) =>
      row.product && !ruleKeys.has(`${row.productId}:${row.locationId}`) && row.available <= row.product.reorderPoint,
    )
    return [...ruleAlerts, ...fallbackAlerts]
  },
}
