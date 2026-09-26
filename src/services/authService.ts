import type { User } from '../types/domain'
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase'

const profileFor = async (id: string, email: string): Promise<User> => {
  const client = requireSupabase()
  const { data, error } = await client.from('profiles').select('id, full_name, role, warehouse_id').eq('id', id).single()
  if (error) throw new Error('Your account profile could not be loaded.')
  return { id: data.id, name: data.full_name ?? email.split('@')[0], email, role: data.role, warehouseId: data.warehouse_id ?? '' }
}

export const authService = {
  async login(email: string, password: string) {
    const client = requireSupabase()
    const { data, error } = await client.auth.signInWithPassword({ email, password })
    if (error || !data.user) throw new Error(error?.message ?? 'Sign-in failed.')
    return profileFor(data.user.id, data.user.email ?? email)
  },
  async signup(name: string, email: string, password: string) {
    const client = requireSupabase()
    const { data, error } = await client.auth.signUp({ email, password, options: { data: { full_name: name } } })
    if (error) throw new Error(error.message)
    if (!data.user) throw new Error('Account creation did not return a user.')
    if (!data.session) return null
    return profileFor(data.user.id, data.user.email ?? email)
  },
  async logout() {
    const { error } = await requireSupabase().auth.signOut()
    if (error) throw new Error('Sign out failed. Please try again.')
  },
  async updateProfileName(name: string) {
    if (!name.trim()) throw new Error('Name is required.')
    const client = requireSupabase()
    const { data, error } = await client.rpc('update_own_profile', { p_full_name: name.trim() })
    if (error || !data) throw new Error('Profile could not be updated.')
    const { data: authData, error: authError } = await client.auth.updateUser({ data: { full_name: name.trim() } })
    if (authError || !authData.user) throw new Error('Profile name saved, but account metadata could not be synchronized.')
    return profileFor(authData.user.id, authData.user.email ?? '')
  },
  async getWarehouseName(warehouseId: string) {
    if (!warehouseId) return 'Not assigned'
    const { data, error } = await requireSupabase().from('warehouses').select('name').eq('id', warehouseId).single()
    if (error) return warehouseId
    return data.name as string
  },
  async getCurrentUser() {
    const client = requireSupabase()
    const { data, error } = await client.auth.getSession()
    if (error) throw new Error('Your session could not be restored. Please sign in again.')
    const sessionUser = data.session?.user
    return sessionUser ? profileFor(sessionUser.id, sessionUser.email ?? '') : null
  },
  async requestPasswordReset(email: string) {
    const client = requireSupabase()
    const redirectTo = `${window.location.origin}/reset-password?email=${encodeURIComponent(email)}`
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) throw new Error('A verification code could not be sent. Check the email and try again.')
  },
  async verifyPasswordReset(email: string, token: string, password: string) {
    const client = requireSupabase()
    const { error } = await client.auth.verifyOtp({ email, token, type: 'recovery' })
    if (error) throw new Error('The verification code is invalid or expired.')
    const { error: updateError } = await client.auth.updateUser({ password })
    if (updateError) throw new Error('The password could not be updated.')
  },
  onAuthStateChange(callback: (user: User | null) => void) {
    if (!isSupabaseConfigured) return () => undefined
    const { data } = requireSupabase().auth.onAuthStateChange((_event, session) => {
      if (!session?.user) callback(null)
      else void profileFor(session.user.id, session.user.email ?? '').then(callback).catch(() => callback(null))
    })
    return () => data.subscription.unsubscribe()
  },
}
