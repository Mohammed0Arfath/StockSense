import type { Product, StockItem } from '../types/domain'

export const stockStatusLabel = (available: number, reorderPoint: number) => {
  if (available <= 0) return 'Out of Stock'
  if (available <= reorderPoint) return 'Low Stock'
  return 'In Stock'
}

export const stockStatusTone = (available: number, reorderPoint: number) => {
  if (available <= 0) return 'destructive'
  if (available <= reorderPoint) return 'warning'
  return 'success'
}

export const availableQty = (stock: StockItem) => Math.max(stock.onHand - stock.reserved, 0)

export const aggregateProductStock = (product: Product, stockItems: StockItem[]) => {
  const rows = stockItems.filter((s) => s.productId === product.id)
  const onHand = rows.reduce((sum, row) => sum + row.onHand, 0)
  const reserved = rows.reduce((sum, row) => sum + row.reserved, 0)
  return { onHand, reserved, available: Math.max(onHand - reserved, 0) }
}
