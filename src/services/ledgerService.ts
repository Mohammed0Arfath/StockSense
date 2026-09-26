import { getState, wait } from './store'

export const ledgerService = {
  async getEntries() {
    await wait()
    return getState().moveHistory
  },
}
