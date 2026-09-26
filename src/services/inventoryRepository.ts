import type { InventoryState } from '../types/domain'
import { getState, subscribeState, updateState } from './store'

/** Persistence boundary for inventory application services. */
export interface InventoryRepository {
  snapshot(): InventoryState
  transact<T>(operation: (draft: InventoryState) => T): T
  subscribe(listener: () => void): () => void
}

/** In-memory adapter used by the current mock-data application. */
export const inventoryRepository: InventoryRepository = {
  snapshot: getState,
  transact: updateState,
  subscribe: subscribeState,
}
