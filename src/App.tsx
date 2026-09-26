import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { NotFoundPage } from './pages/NotFoundPage'
import { useAuth } from './hooks/useAuth'
import { LoadingState } from './components/shared/states'

const LoginPage = lazy(() => import('./features/auth/AuthPages').then((module) => ({ default: module.LoginPage })))
const SignupPage = lazy(() => import('./features/auth/AuthPages').then((module) => ({ default: module.SignupPage })))
const ForgotPasswordPage = lazy(() => import('./features/auth/AuthPages').then((module) => ({ default: module.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('./features/auth/AuthPages').then((module) => ({ default: module.ResetPasswordPage })))
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const ProductsPage = lazy(() => import('./features/products/ProductsPage').then((module) => ({ default: module.ProductsPage })))
const ProductDetailPage = lazy(() => import('./features/products/ProductDetailPage').then((module) => ({ default: module.ProductDetailPage })))
const StockPage = lazy(() => import('./features/stock/StockPage').then((module) => ({ default: module.StockPage })))
const ReceiptsPage = lazy(() => import('./features/receipts/ReceiptsPages').then((module) => ({ default: module.ReceiptsPage })))
const ReceiptNewPage = lazy(() => import('./features/receipts/ReceiptsPages').then((module) => ({ default: module.ReceiptNewPage })))
const ReceiptDetailPage = lazy(() => import('./features/receipts/ReceiptsPages').then((module) => ({ default: module.ReceiptDetailPage })))
const DeliveriesPage = lazy(() => import('./features/deliveries/DeliveriesPages').then((module) => ({ default: module.DeliveriesPage })))
const DeliveryNewPage = lazy(() => import('./features/deliveries/DeliveriesPages').then((module) => ({ default: module.DeliveryNewPage })))
const DeliveryDetailPage = lazy(() => import('./features/deliveries/DeliveriesPages').then((module) => ({ default: module.DeliveryDetailPage })))
const TransfersPage = lazy(() => import('./features/transfers/TransfersPages').then((module) => ({ default: module.TransfersPage })))
const TransferNewPage = lazy(() => import('./features/transfers/TransfersPages').then((module) => ({ default: module.TransferNewPage })))
const TransferDetailPage = lazy(() => import('./features/transfers/TransfersPages').then((module) => ({ default: module.TransferDetailPage })))
const AdjustmentsPage = lazy(() => import('./features/adjustments/AdjustmentsPages').then((module) => ({ default: module.AdjustmentsPage })))
const AdjustmentNewPage = lazy(() => import('./features/adjustments/AdjustmentsPages').then((module) => ({ default: module.AdjustmentNewPage })))
const AdjustmentDetailPage = lazy(() => import('./features/adjustments/AdjustmentsPages').then((module) => ({ default: module.AdjustmentDetailPage })))
const MoveHistoryPage = lazy(() => import('./features/move-history/MoveHistoryPage').then((module) => ({ default: module.MoveHistoryPage })))
const MoveHistoryDetailPage = lazy(() => import('./features/move-history/MoveHistoryPage').then((module) => ({ default: module.MoveHistoryDetailPage })))
const WarehousesPage = lazy(() => import('./features/warehouses/WarehousesPages').then((module) => ({ default: module.WarehousesPage })))
const WarehouseDetailPage = lazy(() => import('./features/warehouses/WarehousesPages').then((module) => ({ default: module.WarehouseDetailPage })))
const LocationsPage = lazy(() => import('./features/locations/LocationsPages').then((module) => ({ default: module.LocationsPage })))
const LocationDetailPage = lazy(() => import('./features/locations/LocationsPages').then((module) => ({ default: module.LocationDetailPage })))
const ReorderingRulesPage = lazy(() => import('./features/reordering-rules/ReorderingRulesPage').then((module) => ({ default: module.ReorderingRulesPage })))
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })))
const ProfilePage = lazy(() => import('./features/profile/ProfilePage').then((module) => ({ default: module.ProfilePage })))

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <LoadingState />
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Suspense fallback={<LoadingState />}>
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
          <Route path="/move-history/:entryId" element={<MoveHistoryDetailPage />} />
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
    </Suspense>
  )
}
