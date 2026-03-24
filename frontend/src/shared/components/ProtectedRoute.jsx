import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, role }) => {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null');
  } catch (e) {
    user = null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    // admin can access any protected route
    if (user.role !== 'admin') {
      return <Navigate to="/login" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
