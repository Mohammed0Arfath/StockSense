export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'
export type DocumentStatus = 'draft' | 'waiting' | 'ready' | 'done' | 'canceled'

export interface User {
  id: string
  name: string
  email: string
  role: string
  warehouseId: string
}

export interface Category {
  id: string
  name: string
}

export interface Warehouse {
  id: string
  name: string
  code: string
  address: string
  status: 'active' | 'inactive'
}

export interface Location {
  id: string
  name: string
  shortCode: string
  warehouseId: string
  type: 'storage' | 'production' | 'receiving' | 'dispatch'
  status: 'active' | 'inactive'
}

export interface Product {
  id: string
  name: string
  sku: string
  categoryId: string
  unit: string
  reorderPoint: number
  defaultWarehouseId: string
  defaultLocationId: string
}

export interface StockItem {
  id: string
  productId: string
  warehouseId: string
  locationId: string
  onHand: number
  reserved: number
}

export interface ReceiptLine {
  id: string
  productId: string
  expectedQuantity: number
  receivedQuantity: number
  unit: string
  locationId: string
}

export interface Receipt {
  id: string
  receiptNumber: string
  vendor: string
  warehouseId: string
  scheduledDate: string
  reference: string
  status: DocumentStatus
  createdBy: string
  lines: ReceiptLine[]
}

export interface DeliveryLine {
  id: string
  productId: string
  requestedQuantity: number
  pickedQuantity: number
  packedQuantity: number
}

export interface Delivery {
  id: string
  deliveryNumber: string
  customer: string
  sourceWarehouseId: string
  scheduledDate: string
  reference: string
  status: DocumentStatus
  createdBy: string
  lines: DeliveryLine[]
}

export interface TransferLine {
  id: string
  productId: string
  quantity: number
}

export interface InternalTransfer {
  id: string
  transferNumber: string
  sourceWarehouseId: string
  sourceLocationId: string
  destinationWarehouseId: string
  destinationLocationId: string
  scheduledDate: string
  status: DocumentStatus
  lines: TransferLine[]
}

export interface StockAdjustment {
  id: string
  adjustmentNumber: string
  productId: string
  warehouseId: string
  locationId: string
  systemQuantity: number
  countedQuantity: number
  reason: string
  status: 'draft' | 'applied'
  createdBy: string
  date: string
}

export interface MoveHistoryEntry {
  id: string
  timestamp: string
  reference: string
  operation: 'Receipt' | 'Delivery' | 'Internal Transfer' | 'Adjustment'
  productId: string
  sku: string
  source: string
  destination: string
  quantity: number
  user: string
  status: string
}

export interface ReorderingRule {
  id: string
  productId: string
  warehouseId: string
  locationId: string
  minQty: number
  maxQty: number
}

export interface AppNotification {
  id: string
  title: string
  message: string
  read: boolean
  createdAt: string
}

export interface InventoryState {
  users: User[]
  categories: Category[]
  warehouses: Warehouse[]
  locations: Location[]
  products: Product[]
  stockItems: StockItem[]
  receipts: Receipt[]
  deliveries: Delivery[]
  transfers: InternalTransfer[]
  adjustments: StockAdjustment[]
  moveHistory: MoveHistoryEntry[]
  reorderingRules: ReorderingRule[]
  notifications: AppNotification[]
}
