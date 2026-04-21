import React from 'react';
import { Navigate } from 'react-router-dom';
import ProtectedRoute from '../../shared/components/ProtectedRoute';

export const renderAuthenticated = (isAuthenticated, element) =>
  isAuthenticated ? element : <Navigate to="/login" replace />;

export const renderProtected = (role, element) => (
  <ProtectedRoute role={role}>{element}</ProtectedRoute>
);