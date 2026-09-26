export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'
export type DocumentStatus = 'draft' | 'waiting' | 'ready' | 'done' | 'canceled'
export type OperationStatus = DocumentStatus | 'applied'
export interface OperationStatusEvent {
  status: OperationStatus
  timestamp: string
}
export type AdjustmentStatus = 'draft' | 'applied'
export type MoveOperation = 'Receipt' | 'Delivery' | 'Internal Transfer' | 'Adjustment'
export type LocationType = 'storage' | 'production' | 'receiving' | 'dispatch'
export type RecordStatus = 'active' | 'inactive'
export type ReorderingStatus = 'Healthy' | 'Reorder Required' | 'Critical'

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
  status: RecordStatus
}

export interface Location {
  id: string
  name: string
  shortCode: string
  warehouseId: string
  type: LocationType
  status: RecordStatus
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
  statusHistory?: OperationStatusEvent[]
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
  sourceLocationId: string
  scheduledDate: string
  reference: string
  status: DocumentStatus
  statusHistory?: OperationStatusEvent[]
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
  statusHistory?: OperationStatusEvent[]
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
  status: AdjustmentStatus
  statusHistory?: OperationStatusEvent[]
  createdBy: string
  date: string
}

export interface MoveHistoryEntry {
  id: string
  timestamp: string
  reference: string
  operation: MoveOperation
  productId: string
  sku: string
  source: string
  destination: string
  /** Signed delta for receipts, deliveries, and adjustments; transfers record positive moved units. */
  quantity: number
  user: string
  status: string
  documentId?: string
  sourceWarehouseId?: string
  sourceLocationId?: string
  destinationWarehouseId?: string
  destinationLocationId?: string
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
