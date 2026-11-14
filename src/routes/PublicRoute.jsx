import { Navigate } from 'react-router-dom';
import LoadingScreen from '../components/common/LoadingScreen.jsx';
import { useAuth } from '../hooks/useAuth.js';

export default function PublicRoute({ children }) {
  const { status, isLoading } = useAuth();

  if (isLoading || status === 'loading') {
    return <LoadingScreen message="Checking your session" />;
  }

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
