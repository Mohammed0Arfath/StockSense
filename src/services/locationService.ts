import { getState, wait } from './store'

export const locationService = {
  async getLocations() {
    await wait()
    const state = getState()
    return state.locations.map((location) => {
      const stock = state.stockItems.filter((item) => item.locationId === location.id)
      return {
        ...location,
        stockCount: stock.reduce((sum, item) => sum + item.onHand, 0),
      }
    })
  },
  async getLocation(id: string) {
    await wait(120)
    return getState().locations.find((location) => location.id === id) ?? null
  },
}
