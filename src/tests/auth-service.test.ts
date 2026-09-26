import { beforeEach, describe, expect, it, vi } from 'vitest'

const { supabaseMock, authMock } = vi.hoisted(() => {
  const authMock = {
    signInWithPassword: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), getSession: vi.fn(),
    resetPasswordForEmail: vi.fn(), verifyOtp: vi.fn(), updateUser: vi.fn(), onAuthStateChange: vi.fn(),
  }
  const supabaseMock = {
    auth: authMock,
    from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn() })) })) })),
    rpc: vi.fn(),
  }
  return { supabaseMock, authMock }
})
vi.mock('../lib/supabase', () => ({ isSupabaseConfigured: true, requireSupabase: () => supabaseMock }))

import { authService } from '../services/authService'

describe('Supabase auth service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabaseMock.from.mockReturnValue({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'profile-1', full_name: 'Morgan Lee', role: 'Warehouse Staff', warehouse_id: 'warehouse-1' }, error: null }) }) }) } as never)
  })

  it('signs in with the supplied credentials and resolves the persisted profile', async () => {
    authMock.signInWithPassword.mockResolvedValue({ data: { user: { id: 'profile-1', email: 'morgan@example.test' } }, error: null })
    await expect(authService.login('morgan@example.test', 'safe-password')).resolves.toMatchObject({
      id: 'profile-1', name: 'Morgan Lee', email: 'morgan@example.test', role: 'Warehouse Staff', warehouseId: 'warehouse-1',
    })
    expect(authMock.signInWithPassword).toHaveBeenCalledWith({ email: 'morgan@example.test', password: 'safe-password' })
  })

  it('requests a password recovery code through Supabase Auth', async () => {
    authMock.resetPasswordForEmail.mockResolvedValue({ error: null })
    await expect(authService.requestPasswordReset('morgan@example.test')).resolves.toBeUndefined()
    expect(authMock.resetPasswordForEmail).toHaveBeenCalledWith('morgan@example.test', {
      redirectTo: expect.stringContaining('/reset-password?email=morgan%40example.test'),
    })
  })

  it('does not return a user before signup email confirmation creates a session', async () => {
    authMock.signUp.mockResolvedValue({ data: { user: { id: 'profile-1', email: 'morgan@example.test' }, session: null }, error: null })
    await expect(authService.signup('Morgan Lee', 'morgan@example.test', 'safe-password')).resolves.toBeNull()
  })
})

