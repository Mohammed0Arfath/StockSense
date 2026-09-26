import { FormSection } from '../../components/shared/form-section'
import { PageHeader } from '../../components/shared/page-header'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'

export const SettingsPage = () => (
  <div className="space-y-4">
    <PageHeader title="Settings" description="General, warehouse configuration, inventory preferences, notifications, and profile settings" />
    <FormSection title="General"><Input placeholder="Organization Name" /></FormSection>
    <FormSection title="Warehouse Configuration"><Select><option>Main Warehouse</option></Select></FormSection>
    <FormSection title="Inventory Preferences"><Input type="number" placeholder="Default lead time (days)" /></FormSection>
    <FormSection title="Notifications"><Select><option>Email + In-app</option></Select></FormSection>
    <FormSection title="Profile"><Input placeholder="Display Name" /></FormSection>
  </div>
)
