import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '../../components/shared/page-header'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { useAuth } from '../../hooks/useAuth'
import { authService } from '../../services/authService'

export const ProfilePage = () => {
  const { user, updateProfileName } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const warehouse = useQuery({ queryKey: ['profile-warehouse', user?.warehouseId], queryFn: () => authService.getWarehouseName(user?.warehouseId ?? ''), enabled: Boolean(user) })
  const update = useMutation({
    mutationFn: () => updateProfileName(name),
    onSuccess: () => toast.success('Profile updated.'),
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Profile could not be updated.'),
  })
  if (!user) return <p className="text-sm text-slate-400">Sign in to view your profile.</p>
  return <div className="space-y-4">
    <PageHeader title="My Profile" description="Account and role information" />
    <Card><CardContent className="space-y-3 pt-5 text-sm">
      <label className="grid max-w-md gap-1 text-slate-400">Name<Input value={name} onChange={(event) => setName(event.target.value)} /></label>
      <p>Email: {user.email}</p><p>Role: {user.role}</p><p>Warehouse: {warehouse.data ?? 'Loading…'}</p>
      <Button disabled={update.isPending || !name.trim() || name.trim() === user.name} onClick={() => update.mutate()}>{update.isPending ? 'Saving…' : 'Save Profile'}</Button>
    </CardContent></Card>
  </div>
}
