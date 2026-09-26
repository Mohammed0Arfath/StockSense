import { useEffect, useMemo, useState } from 'react'
import { authService } from '../services/authService'
import { hydrateInventory } from '../services/inventoryRepository'
import { AuthContext, type AuthContextValue } from './useAuth'
import type { User } from '../types/domain'

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    void authService.getCurrentUser().then(async (current) => { if (current) await hydrateInventory(); if (mounted) setUser(current) }).catch(() => { if (mounted) setUser(null) }).finally(() => { if (mounted) setLoading(false) })
    const unsubscribe = authService.onAuthStateChange((next) => {
      if (next) void hydrateInventory().then(() => setUser(next)).catch(() => setUser(null))
      else setUser(null)
    })
    return () => { mounted = false; unsubscribe() }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    login: async (email, password) => { const authenticated = await authService.login(email, password); await hydrateInventory(); setUser(authenticated) },
    signup: async (name, email, password) => {
      const created = await authService.signup(name, email, password)
      if (created) { await hydrateInventory(); setUser(created) }
      return Boolean(created)
    },
    updateProfileName: async (name) => setUser(await authService.updateProfileName(name)),
    logout: async () => { await authService.logout(); setUser(null) },
  }), [user, isLoading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

