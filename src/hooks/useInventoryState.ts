import { useSyncExternalStore } from 'react'
import { inventoryRepository } from '../services/inventoryRepository'

export const useInventoryState = () =>
  useSyncExternalStore(inventoryRepository.subscribe, inventoryRepository.snapshot, inventoryRepository.snapshot)
