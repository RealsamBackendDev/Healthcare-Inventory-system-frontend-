import { Navigate, Outlet, useLocation } from 'react-router-dom';
import LoadingScreen from '../components/common/LoadingScreen.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { PERMISSIONS } from '../utils/permissions.js';

const LG_PAGE_PERMISSIONS = {
  '/lg/warehouse': PERMISSIONS.LG_WAREHOUSE_VIEW,
  '/lg/requests': PERMISSIONS.REQUISITIONS_LG_REVIEW,
  '/lg/dispatches': PERMISSIONS.LG_WAREHOUSE_VIEW,
  '/lg/reports': PERMISSIONS.LG_REPORTS_VIEW,
  '/lg/consolidations': PERMISSIONS.LG_CONSOLIDATIONS_MANAGE,
  '/lg/orders': PERMISSIONS.LG_ORDERS_MANAGE,
  '/lg/transfers': PERMISSIONS.LG_TRANSFERS_MANAGE,
  '/lg/centres': PERMISSIONS.ORGANISATIONS_MANAGE,
  '/lg/users': PERMISSIONS.USERS_MANAGE,
  '/lg/audit': PERMISSIONS.AUDIT_VIEW,
  '/lg/drugs': PERMISSIONS.DRUGS_VIEW
};

export default function ProtectedRoute() {
  const { status, session, hasPermission } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <LoadingScreen message="Preparing your workspace" />;
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (session?.user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  const isLocalGovernment = Boolean(session?.activeLocalGovernment) && !session?.activeCentre;
  const localGovernmentPaths = ['/lg', '/change-password'];
  const onLocalGovernmentPath = localGovernmentPaths.some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
  );
  if (isLocalGovernment && !onLocalGovernmentPath) {
    return <Navigate to="/lg" replace />;
  }

  if (isLocalGovernment) {
    const required = Object.entries(LG_PAGE_PERMISSIONS).find(
      ([path]) => location.pathname === path || location.pathname.startsWith(`${path}/`)
    );
    if (required && !hasPermission(required[1])) {
      return <Navigate to="/lg" replace />;
    }
  }

  return <Outlet />;
}
