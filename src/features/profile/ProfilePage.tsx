import { PageHeader } from '../../components/shared/page-header'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { getState } from '../../services/store'

export const ProfilePage = () => {
  const user = getState().users[0]
  const warehouse = getState().warehouses.find((w) => w.id === user.warehouseId)

  return (
    <div className="space-y-4">
      <PageHeader title="My Profile" description="Account and role information" />
      <Card><CardContent className="space-y-2 text-sm">
        <p>Name: {user.name}</p>
        <p>Email: {user.email}</p>
        <p>Role: {user.role}</p>
        <p>Warehouse: {warehouse?.name}</p>
      </CardContent></Card>
      <div className="flex gap-2"><Button variant="secondary">Edit Profile</Button><Button variant="secondary">Change Password</Button></div>
    </div>
  )
}
