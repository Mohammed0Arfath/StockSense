import { getState } from './store'

export const getWarehouseName = (warehouseId: string) =>
  getState().warehouses.find((w) => w.id === warehouseId)?.name ?? 'Unknown Warehouse'

export const getLocationName = (locationId: string) =>
  getState().locations.find((l) => l.id === locationId)?.name ?? 'Unknown Location'

export const getProductById = (productId: string) => getState().products.find((p) => p.id === productId)

export const getUserName = (userId: string) => getState().users.find((u) => u.id === userId)?.name ?? 'System'
