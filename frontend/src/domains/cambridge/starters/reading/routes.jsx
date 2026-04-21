import React, { lazy } from 'react';
import { Navigate, Route } from 'react-router-dom';
import { renderAuthenticated, renderProtected } from '../../../../app/routes/routeUtils';

const CreateStartersReadingPage = lazy(() => import('./teacher/pages/CreateStartersReadingPage'));
const EditStartersReadingPage = lazy(() => import('./teacher/pages/EditStartersReadingPage'));
const DoStartersReadingTestPage = lazy(() => import('./student/pages/DoStartersReadingTestPage'));

export const buildStartersReadingRoutes = ({ isAuthenticated }) => [
  <Route key="admin-create-starters" path="/admin/create-starters" element={renderProtected('teacher', <Navigate to="/admin/create/starters" replace />)} />,
  <Route key="admin-create-starters-reading-legacy" path="/admin/create-starters-reading" element={renderProtected('teacher', <Navigate to="/admin/create/starters" replace />)} />,
  <Route key="admin-create-starters-canonical" path="/admin/create/starters" element={renderProtected('teacher', <CreateStartersReadingPage />)} />,
  <Route key="cambridge-starters-reading-edit" path="/cambridge/starters-reading/:id/edit" element={renderProtected('teacher', <EditStartersReadingPage />)} />,
  <Route key="cambridge-starters-reading" path="/cambridge/starters-reading/:id" element={renderAuthenticated(isAuthenticated, <DoStartersReadingTestPage />)} />,
];