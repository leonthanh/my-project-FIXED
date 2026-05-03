import React from 'react';
import { Navigate } from 'react-router-dom';
import { clearAuth, getStoredUser, hasStoredSession } from '../utils/api';

const ProtectedRoute = ({ children, role }) => {
  const user = getStoredUser();
  const hasToken = hasStoredSession();

  if (!user || !hasToken) {
    if (!hasToken) {
      clearAuth();
    }
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    if (user.role === 'admin') {
      return children;
    }

    const fallbackPath = user.role === 'teacher' ? '/review' : '/';
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
};

export default ProtectedRoute;
