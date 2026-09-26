import type { DeliveryLine, InventoryState, OperationStatusEvent, ReceiptLine, TransferLine } from '../types/domain'
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase'
import { getState, replaceState, subscribeState, updateState } from './store'

/** Persistence boundary used by feature services and inventory hooks. */
export interface InventoryRepository {
  snapshot(): InventoryState
  transact<T>(operation: (draft: InventoryState) => T): T
  subscribe(listener: () => void): () => void
  createReceipt(document: Record<string, unknown>): Promise<void>
  createDelivery(document: Record<string, unknown>): Promise<void>
  createTransfer(document: Record<string, unknown>): Promise<void>
  createAdjustment(document: Record<string, unknown>): Promise<void>
  createProduct(document: Record<string, unknown>): Promise<void>
  setDocumentStatus(kind: 'receipt' | 'delivery' | 'transfer', id: string, status: string): Promise<void>
  pickDelivery(id: string): Promise<void>
  packDelivery(id: string): Promise<void>
  validateReceipt(id: string): Promise<void>
  validateDelivery(id: string): Promise<void>
  validateTransfer(id: string): Promise<void>
  applyAdjustment(id: string): Promise<void>
  updateProduct(id: string, values: Record<string, unknown>): Promise<void>
}

const camel = (key: string) => key.replace(/_([a-z])/g, (_match, character: string) => character.toUpperCase())
const numericFields = new Set(['reorderPoint','onHand','reserved','expectedQuantity','receivedQuantity','requestedQuantity','pickedQuantity','packedQuantity','quantity','systemQuantity','countedQuantity','minQty','maxQty'])
const rows = <T>(values: unknown[]) => values.map((value) => Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, field]) => {
  const mappedKey = camel(key)
  return [mappedKey, numericFields.has(mappedKey) && field !== null ? Number(field) : field]
}))) as T[]
const checked = <T>(result: { data: T | null; error: { message: string } | null }) => {
  if (result.error || !result.data) throw new Error('Inventory data could not be loaded from the database.')
  return result.data
}

export const isPersistentInventory = isSupabaseConfigured && import.meta.env.MODE !== 'test'

export const hydrateInventory = async () => {
  if (!isPersistentInventory) return
  const client = requireSupabase()
  const [usersResult, categoriesResult, warehousesResult, locationsResult, productsResult, stockResult, receiptsResult, receiptLinesResult, deliveriesResult, deliveryLinesResult, transfersResult, transferLinesResult, adjustmentsResult, ledgerResult, rulesResult, notificationsResult, historyResult] = await Promise.all([
    client.from('profiles').select('id,full_name,role,warehouse_id'),
    client.from('categories').select('*'),
    client.from('warehouses').select('*'),
    client.from('locations').select('*'),
    client.from('products').select('*'),
    client.from('stock_items').select('*'),
    client.from('receipts').select('*'),
    client.from('receipt_lines').select('*'),
    client.from('deliveries').select('*'),
    client.from('delivery_lines').select('*'),
    client.from('internal_transfers').select('*'),
    client.from('transfer_lines').select('*'),
    client.from('stock_adjustments').select('*'),
    client.from('move_history').select('*').order('occurred_at', { ascending: false }),
    client.from('reordering_rules').select('*'),
    client.from('notifications').select('*'),
    client.from('operation_status_history').select('*').order('recorded_at', { ascending: true }),
  ])
  const users = checked(usersResult).map((row) => ({ id: row.id, name: row.full_name, email: '', role: row.role, warehouseId: row.warehouse_id ?? '' }))
  const categories = rows<InventoryState['categories'][number]>(checked(categoriesResult))
  const warehouses = rows<InventoryState['warehouses'][number]>(checked(warehousesResult))
  const locations = rows<InventoryState['locations'][number]>(checked(locationsResult))
  const products = rows<InventoryState['products'][number]>(checked(productsResult))
  const stockItems = rows<InventoryState['stockItems'][number]>(checked(stockResult))
  const histories = checked(historyResult)
  const events = (type: string, id: string) => histories.filter((row) => row.entity_type === type && row.entity_id === id).map((row) => ({ status: row.status, timestamp: row.recorded_at }) as OperationStatusEvent)
  const receiptLines = checked(receiptLinesResult)
  const deliveryLines = checked(deliveryLinesResult)
  const transferLines = checked(transferLinesResult)
  const receipts = rows<Omit<InventoryState['receipts'][number], 'lines'>>(checked(receiptsResult)).map((row) => ({ ...row, statusHistory: events('receipt', row.id), lines: rows<ReceiptLine>(receiptLines.filter((line) => line.receipt_id === row.id)) }))
  const deliveries = rows<Omit<InventoryState['deliveries'][number], 'lines'>>(checked(deliveriesResult)).map((row) => ({ ...row, statusHistory: events('delivery', row.id), lines: rows<DeliveryLine>(deliveryLines.filter((line) => line.delivery_id === row.id)) }))
  const transfers = rows<Omit<InventoryState['transfers'][number], 'lines'>>(checked(transfersResult)).map((row) => ({ ...row, statusHistory: events('transfer', row.id), lines: rows<TransferLine>(transferLines.filter((line) => line.transfer_id === row.id)) }))
  const adjustments = rows<Record<string, unknown>>(checked(adjustmentsResult)).map((row) => ({ ...row, date: row.scheduledDate as string, statusHistory: events('adjustment', row.id as string) })) as InventoryState['adjustments']
  const moveHistory = rows<Record<string, unknown>>(checked(ledgerResult)).map((row) => ({ ...row, timestamp: row.occurredAt as string, user: users.find((user) => user.id === row.userId)?.name ?? 'System' })) as InventoryState['moveHistory']
  const reorderingRules = rows<InventoryState['reorderingRules'][number]>(checked(rulesResult))
  const notifications = rows<InventoryState['notifications'][number]>(checked(notificationsResult))
  replaceState({ users, categories, warehouses, locations, products, stockItems, receipts, deliveries, transfers, adjustments, moveHistory, reorderingRules, notifications })
}

const snake = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(snake)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, field]) => [key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`), snake(field)]))
  return value
}

const persistDocument = async (kind: 'receipt' | 'delivery' | 'transfer' | 'adjustment' | 'product', document: Record<string, unknown>) => {
  const client = requireSupabase()
  const { error } = await client.rpc(`create_${kind}`, { p_document: snake(document) })
  if (error) throw new Error(error.message.includes('duplicate key') ? 'A document with this reference already exists.' : 'The document could not be saved.')
  await hydrateInventory()
}

const persistStatus = async (kind: 'receipt' | 'delivery' | 'transfer', id: string, status: string) => {
  const client = requireSupabase()
  const table = kind === 'receipt' ? 'receipts' : kind === 'delivery' ? 'deliveries' : 'internal_transfers'
  const { data, error } = await client.from(table).update({ status }).eq('id', id).select('id').maybeSingle()
  if (error || !data) throw new Error(error?.message.includes('Inventory Manager') ? 'This operation requires an Inventory Manager role.' : 'The operation status could not be updated.')
  await hydrateInventory()
}

const persistLineProgress = async (kind: 'delivery', id: string, stage: 'picked' | 'packed') => {
  const { error } = await requireSupabase().rpc(`${stage}_${kind}`, { p_delivery_id: id })
  if (error) throw new Error(error.message.includes('stock') ? error.message : 'Delivery progress could not be saved.')
  await hydrateInventory()
}

const persistInventoryRpc = async (name: 'validate_receipt' | 'validate_delivery' | 'validate_transfer' | 'apply_stock_adjustment', id: string) => {
  const parameter = name === 'validate_receipt' ? 'p_receipt_id' : name === 'validate_delivery' ? 'p_delivery_id' : name === 'validate_transfer' ? 'p_transfer_id' : 'p_adjustment_id'
  const { error } = await requireSupabase().rpc(name, { [parameter]: id })
  if (error) {
    const insufficient = error.message.match(/Insufficient available stock for SKU (.*?): requested ([0-9.]+), available ([0-9.]+)/i)
    if (insufficient) throw new Error(`Unable to complete operation: requested ${insufficient[2]} units of ${insufficient[1]}, but only ${insufficient[3]} are available.`)
    if (/Inventory Manager role required/i.test(error.message)) throw new Error('This operation requires an Inventory Manager role.')
    if (/Authenticated warehouse role required/i.test(error.message)) throw new Error('A warehouse role is required to complete this operation.')
    throw new Error('The inventory transaction could not be completed.')
  }
  await hydrateInventory()
}

const persistProductUpdate = async (id: string, values: Record<string, unknown>) => {
  const { error } = await requireSupabase().from('products').update(snake(values) as never).eq('id', id)
  if (error) throw new Error(error.message.includes('duplicate key') ? 'A product with this SKU already exists.' : 'Product could not be saved.')
  await hydrateInventory()
}

/** The sync adapter remains useful for test fixtures and isolated unit tests. */
export const inventoryRepository: InventoryRepository = {
  snapshot: getState,
  transact: updateState,
  subscribe: subscribeState,
  createReceipt: (document) => persistDocument('receipt', document),
  createDelivery: (document) => persistDocument('delivery', document),
  createTransfer: (document) => persistDocument('transfer', document),
  createAdjustment: (document) => persistDocument('adjustment', document),
  createProduct: (document) => persistDocument('product', document),
  setDocumentStatus: persistStatus,
  pickDelivery: (id) => persistLineProgress('delivery', id, 'picked'),
  packDelivery: (id) => persistLineProgress('delivery', id, 'packed'),
  validateReceipt: (id) => persistInventoryRpc('validate_receipt', id),
  validateDelivery: (id) => persistInventoryRpc('validate_delivery', id),
  validateTransfer: (id) => persistInventoryRpc('validate_transfer', id),
  applyAdjustment: (id) => persistInventoryRpc('apply_stock_adjustment', id),
  updateProduct: persistProductUpdate,
}
