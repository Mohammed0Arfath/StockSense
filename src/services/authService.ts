import { wait } from './store'
import type { User } from '../types/domain'

const AUTH_KEY = 'stocksense.auth.user'

const fakeUser: User = {
  id: 'u1',
  name: 'Aisha Khan',
  email: 'aisha@stocksense.local',
  role: 'Inventory Manager',
  warehouseId: 'w1',
}

export const authService = {
  async login() {
    await wait()
    localStorage.setItem(AUTH_KEY, JSON.stringify(fakeUser))
    return fakeUser
  },
  async signup() {
    await wait()
    localStorage.setItem(AUTH_KEY, JSON.stringify(fakeUser))
    return fakeUser
  },
  async logout() {
    await wait(100)
    localStorage.removeItem(AUTH_KEY)
  },
  async forgotPassword() {
    await wait()
    return { success: true }
  },
  getCurrentUser() {
    const raw = localStorage.getItem(AUTH_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  },
}
