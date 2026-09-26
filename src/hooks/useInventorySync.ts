import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { inventoryRepository } from '../services/inventoryRepository'

export const useInventorySync = () => {
  const queryClient = useQueryClient()
  useEffect(() => {
    return inventoryRepository.subscribe(() => {
      queryClient.invalidateQueries()
    })
  }, [queryClient])
}
