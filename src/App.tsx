import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { LoginPage, SignupPage, ForgotPasswordPage, ResetPasswordPage } from './features/auth/AuthPages'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { ProductsPage } from './features/products/ProductsPage'
import { ProductDetailPage } from './features/products/ProductDetailPage'
import { StockPage } from './features/stock/StockPage'
import { ReceiptsPage, ReceiptNewPage, ReceiptDetailPage } from './features/receipts/ReceiptsPages'
import { DeliveriesPage, DeliveryNewPage, DeliveryDetailPage } from './features/deliveries/DeliveriesPages'
import { TransfersPage, TransferNewPage, TransferDetailPage } from './features/transfers/TransfersPages'
import { AdjustmentsPage, AdjustmentNewPage, AdjustmentDetailPage } from './features/adjustments/AdjustmentsPages'
import { MoveHistoryPage } from './features/move-history/MoveHistoryPage'
import { WarehousesPage, WarehouseDetailPage } from './features/warehouses/WarehousesPages'
import { LocationsPage, LocationDetailPage } from './features/locations/LocationsPages'
import { ReorderingRulesPage } from './features/reordering-rules/ReorderingRulesPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { ProfilePage } from './features/profile/ProfilePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { useAuth } from './hooks/useAuth'

const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:productId" element={<ProductDetailPage />} />
          <Route path="/stock" element={<StockPage />} />

          <Route path="/receipts" element={<ReceiptsPage />} />
          <Route path="/receipts/new" element={<ReceiptNewPage />} />
          <Route path="/receipts/:receiptId" element={<ReceiptDetailPage />} />

          <Route path="/deliveries" element={<DeliveriesPage />} />
          <Route path="/deliveries/new" element={<DeliveryNewPage />} />
          <Route path="/deliveries/:deliveryId" element={<DeliveryDetailPage />} />

          <Route path="/transfers" element={<TransfersPage />} />
          <Route path="/transfers/new" element={<TransferNewPage />} />
          <Route path="/transfers/:transferId" element={<TransferDetailPage />} />

          <Route path="/adjustments" element={<AdjustmentsPage />} />
          <Route path="/adjustments/new" element={<AdjustmentNewPage />} />
          <Route path="/adjustments/:adjustmentId" element={<AdjustmentDetailPage />} />

          <Route path="/move-history" element={<MoveHistoryPage />} />
          <Route path="/warehouses" element={<WarehousesPage />} />
          <Route path="/warehouses/:warehouseId" element={<WarehouseDetailPage />} />
          <Route path="/locations" element={<LocationsPage />} />
          <Route path="/locations/:locationId" element={<LocationDetailPage />} />
          <Route path="/reordering-rules" element={<ReorderingRulesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
