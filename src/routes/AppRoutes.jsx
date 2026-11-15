import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import PublicRoute from './PublicRoute.jsx';
import LoginPage from '../features/auth/LoginPage.jsx';
import DashboardPage from '../features/dashboard/DashboardPage.jsx';
import InventoryPage from '../features/inventory/InventoryPage.jsx';
import DrugsPage from '../features/drugs/DrugsPage.jsx';
import ReceivingPage from '../features/receiving/ReceivingPage.jsx';
import DispensingPage from '../features/dispensing/DispensingPage.jsx';
import AdjustmentsPage from '../features/adjustments/AdjustmentsPage.jsx';
import StockCountPage from '../features/adjustments/StockCountPage.jsx';
import RequisitionsPage from '../features/requisitions/RequisitionsPage.jsx';
import ExpiryPage from '../features/expiry/ExpiryPage.jsx';
import ReportsPage from '../features/reports/ReportsPage.jsx';
import UsersPage from '../features/users/UsersPage.jsx';
import AuditPage from '../features/users/AuditPage.jsx';
import SettingsPage from '../features/settings/SettingsPage.jsx';
import ProfilePage from '../features/auth/ProfilePage.jsx';
import LgOverviewPage from '../features/lg/LgOverviewPage.jsx';
import LgWarehousePage from '../features/lg/LgWarehousePage.jsx';
import LgRequestsPage from '../features/lg/LgRequestsPage.jsx';
import LgDispatchesPage from '../features/lg/LgDispatchesPage.jsx';
import LgReportsPage from '../features/lg/LgReportsPage.jsx';
import LgApprovalsPage from '../features/lg/LgApprovalsPage.jsx';
import LgConsolidationsPage from '../features/lg/LgConsolidationsPage.jsx';
import LgOrdersPage from '../features/lg/LgOrdersPage.jsx';
import LgTransfersPage from '../features/lg/LgTransfersPage.jsx';
import TransfersPage from '../features/transfers/TransfersPage.jsx';
import DeliveriesPage from '../features/deliveries/DeliveriesPage.jsx';
import ChangePasswordPage from '../features/auth/ChangePasswordPage.jsx';
import ComingSoon from '../components/common/ComingSoon.jsx';
import NotFound from '../components/common/NotFound.jsx';
import { allNavigationItems } from '../utils/navigation.js';

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      <Route element={<ProtectedRoute />}>
        <Route path="/lg" element={<LgOverviewPage />} />
        <Route path="/lg/warehouse" element={<LgWarehousePage />} />
        <Route path="/lg/requests" element={<LgRequestsPage />} />
        <Route path="/lg/dispatches" element={<LgDispatchesPage />} />
        <Route path="/lg/reports" element={<LgReportsPage />} />
        <Route path="/lg/approvals" element={<LgApprovalsPage />} />
        <Route path="/lg/consolidations" element={<LgConsolidationsPage />} />
        <Route path="/lg/orders" element={<LgOrdersPage />} />
        <Route path="/lg/transfers" element={<LgTransfersPage />} />
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/drugs" element={<DrugsPage />} />
          <Route path="/receiving" element={<ReceivingPage />} />
          <Route path="/dispensing" element={<DispensingPage />} />
          <Route path="/adjustments" element={<AdjustmentsPage />} />
          <Route path="/adjustments/stock-count" element={<StockCountPage />} />
          <Route path="/requisitions" element={<RequisitionsPage />} />
          <Route path="/deliveries" element={<DeliveriesPage />} />
          <Route path="/transfers" element={<TransfersPage />} />
          <Route path="/expiry" element={<ExpiryPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          {allNavigationItems
            .filter(
              (item) =>
                ![
                  '/dashboard',
                  '/inventory',
                  '/drugs',
                  '/receiving',
                  '/dispensing',
                  '/adjustments',
                  '/requisitions',
                  '/deliveries',
                  '/expiry',
                  '/reports',
                  '/users',
                  '/settings',
                  '/audit'
                ].includes(item.to)
            )
            .map((item) => (
              <Route key={item.to} path={item.to} element={<ComingSoon title={item.label} />} />
            ))}
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
