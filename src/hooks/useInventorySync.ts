import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { subscribeState } from '../services/store'

export const useInventorySync = () => {
  const queryClient = useQueryClient()
  useEffect(() => {
    return subscribeState(() => {
      queryClient.invalidateQueries()
    })
  }, [queryClient])
}
