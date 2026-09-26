import { initialInventoryState } from '../data/mockData'
import type { InventoryState } from '../types/domain'

let state: InventoryState = structuredClone(initialInventoryState)
const listeners = new Set<() => void>()

export const wait = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms))

export const getState = () => state

export const updateState = (mutator: (draft: InventoryState) => void) => {
  const draft = structuredClone(state)
  mutator(draft)
  state = draft
  listeners.forEach((listener) => listener())
}

export const subscribeState = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const resetState = () => {
  state = structuredClone(initialInventoryState)
  listeners.forEach((listener) => listener())
}
