import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

export default function ProtectedRoute({ children, adminOnly = false, allowedRoles = null }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <Spinner fullpage size="lg" label="Loading Dashboard" />;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
