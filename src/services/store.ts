import { initialInventoryState } from '../data/mockData'
import type { InventoryState } from '../types/domain'

let state: InventoryState = structuredClone(initialInventoryState)
const listeners = new Set<() => void>()

export const wait = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms))

export const getState = () => state

export const updateState = <T>(mutator: (draft: InventoryState) => T): T => {
  const draft = structuredClone(state)
  const result = mutator(draft)
  state = draft
  listeners.forEach((listener) => listener())
  return result
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

export const replaceState = (nextState: InventoryState) => {
  state = structuredClone(nextState)
  listeners.forEach((listener) => listener())
}
