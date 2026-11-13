import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import PublicRoute from './PublicRoute.jsx';
import LoginPage from '../features/auth/LoginPage.jsx';
import DashboardPage from '../features/dashboard/DashboardPage.jsx';
import InventoryPage from '../features/inventory/InventoryPage.jsx';
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
                                                                                        <Route element={<AppLayout />}>
                                                                                                  <Route index element={<Navigate to="/dashboard" replace />} />
                                                                                                            <Route path="/dashboard" element={<DashboardPage />} />
                                                                                                                      <Route path="/inventory" element={<InventoryPage />} />
                                                                                                                                {allNavigationItems
                                                                                                                                            .filter((item) => !['/dashboard', '/inventory'].includes(item.to))
                                                                                                                                                        .map((item) => (
                                                                                                                                                                      <Route key={item.to} path={item.to} element={<ComingSoon title={item.label} />} />
                                                                                                                                                                                  ))}
                                                                                                                                                                                            <Route path="/profile" element={<ComingSoon title="My profile" />} />
                                                                                                                                                                                                      <Route path="/change-password" element={<ChangePasswordPage />} />
                                                                                                                                                                                                                <Route path="*" element={<NotFound />} />
                                                                                                                                                                                                                        </Route>
                                                                                                                                                                                                                              </Route>
                                                                                                                                                                                                                                  </Routes>
                                                                                                                                                                                                                                    );
                                                                                                                                                                                                                                    }