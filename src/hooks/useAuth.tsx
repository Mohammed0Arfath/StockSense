import { createContext, useContext, useMemo, useState } from 'react'
import { authService } from '../services/authService'
import type { User } from '../types/domain'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  login: () => Promise<void>
  signup: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => authService.getCurrentUser())

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login: async () => setUser(await authService.login()),
      signup: async () => setUser(await authService.signup()),
      logout: async () => {
        await authService.logout()
        setUser(null)
      },
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
