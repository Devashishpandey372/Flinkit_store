import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children, adminOnly = false, adminOrShopkeeper = false }) => {
  const { loading, isAuthenticated, isAdmin, canAccessAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Admin or Shopkeeper portal routes
  if (adminOnly || adminOrShopkeeper) {
    if (!isAuthenticated) {
      const redirectUrl = location.pathname + location.search;
      return (
        <Navigate
          to={`/admin/login?redirect=${encodeURIComponent(redirectUrl)}`}
          state={{ from: location }}
          replace
        />
      );
    }

    if (adminOnly && !isAdmin) {
      return <Navigate to="/admin/dashboard" replace />;
    }

    if (adminOrShopkeeper && !canAccessAdmin) {
      return <Navigate to="/admin/login?error=approval_required" replace />;
    }

    return children;
  }

  // Standard Customer Protected Routes (Checkout, Profile, Orders)
  if (!isAuthenticated) {
    const redirectUrl = location.pathname + location.search;
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(redirectUrl)}`}
        state={{ from: location }}
        replace
      />
    );
  }

  return children;
};

export default ProtectedRoute;
