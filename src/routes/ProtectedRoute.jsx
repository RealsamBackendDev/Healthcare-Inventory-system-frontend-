import { Navigate, Outlet, useLocation } from 'react-router-dom';
import LoadingScreen from '../components/common/LoadingScreen.jsx';
import { useAuth } from '../hooks/useAuth.js';

export default function ProtectedRoute() {
  const { status, session } = useAuth();
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
  if (isLocalGovernment && !localGovernmentPaths.includes(location.pathname)) {
    return <Navigate to="/lg" replace />;
  }

  return <Outlet />;
}
