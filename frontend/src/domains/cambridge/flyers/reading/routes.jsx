import React, { lazy } from 'react';
import { Navigate, Route } from 'react-router-dom';
import { renderAuthenticated, renderProtected } from '../../../../app/routes/routeUtils';

const CreateFlyersReadingPage = lazy(() => import('./teacher/pages/CreateFlyersReadingPage'));
const EditFlyersReadingPage = lazy(() => import('./teacher/pages/EditFlyersReadingPage'));
const DoFlyersReadingTestPage = lazy(() => import('./student/pages/DoFlyersReadingTestPage'));

export const buildFlyersReadingRoutes = ({ isAuthenticated }) => [
  <Route key="admin-create-flyers-legacy" path="/admin/create-flyers" element={renderProtected('teacher', <Navigate to="/admin/create/flyers" replace />)} />,
  <Route key="admin-create-flyers" path="/admin/create/flyers" element={renderProtected('teacher', <CreateFlyersReadingPage />)} />,
  <Route key="admin-create-flyers-reading-legacy" path="/admin/create-flyers-reading" element={renderProtected('teacher', <Navigate to="/admin/create/flyers" replace />)} />,
  <Route key="cambridge-flyers-reading-edit" path="/cambridge/flyers-reading/:id/edit" element={renderProtected('teacher', <EditFlyersReadingPage />)} />,
  <Route key="cambridge-flyers-reading" path="/cambridge/flyers-reading/:id" element={renderAuthenticated(isAuthenticated, <DoFlyersReadingTestPage />)} />,
];