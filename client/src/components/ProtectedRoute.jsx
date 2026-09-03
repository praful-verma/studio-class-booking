import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading, isStaff, isInstructor } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading user profile...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole === 'STAFF' && !isStaff) {
    return <Navigate to="/sessions" replace />;
  }

  if (requiredRole === 'INSTRUCTOR' && !isInstructor && !isStaff) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
