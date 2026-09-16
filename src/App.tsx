import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { RouteErrorBoundary } from '@/components/layout/RouteErrorBoundary'
import { LoginPage } from '@/features/auth/LoginPage'

// Route-level code splitting: each feature page ships as its own chunk so a
// visit to, say, the dashboard never pulls in jspdf/xlsx/dnd-kit that only
// the WiFi and pipeline modules need. Keeps the initial bundle under the
// 500KB gzip budget as more phases (and their heavier dependencies) land.
const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('@/features/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })))
const FirstRunSetupPage = lazy(() => import('@/features/auth/FirstRunSetupPage').then((m) => ({ default: m.FirstRunSetupPage })))
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const CustomersListPage = lazy(() => import('@/features/customers/CustomersListPage').then((m) => ({ default: m.CustomersListPage })))
const CustomerDetailPage = lazy(() => import('@/features/customers/CustomerDetailPage').then((m) => ({ default: m.CustomerDetailPage })))
const MyDayPage = lazy(() => import('@/features/tasks/MyDayPage').then((m) => ({ default: m.MyDayPage })))
const PipelinePage = lazy(() => import('@/features/deals/PipelinePage').then((m) => ({ default: m.PipelinePage })))
const SellVoucherPage = lazy(() => import('@/features/wifi/SellVoucherPage').then((m) => ({ default: m.SellVoucherPage })))
const WifiHubPage = lazy(() => import('@/features/wifi/WifiHubPage').then((m) => ({ default: m.WifiHubPage })))
const TicketsPage = lazy(() => import('@/features/tickets/TicketsPage').then((m) => ({ default: m.TicketsPage })))
const BillingHubPage = lazy(() => import('@/features/billing/BillingHubPage').then((m) => ({ default: m.BillingHubPage })))

function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="size-8 animate-pulse rounded-full bg-accent/20" />
    </div>
  )
}

function App() {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/setup" element={<FirstRunSetupPage />} />

          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/customers" element={<CustomersListPage />} />
            <Route path="/customers/:id" element={<CustomerDetailPage />} />
            <Route path="/my-day" element={<MyDayPage />} />
            <Route path="/pipeline" element={<PipelinePage />} />
            <Route path="/sell" element={<SellVoucherPage />} />
            <Route path="/wifi" element={<WifiHubPage />} />
            <Route path="/tickets" element={<TicketsPage />} />
            <Route path="/billing" element={<BillingHubPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  )
}

export default App
