import React, { lazy } from 'react';
import { Navigate, Route } from 'react-router-dom';
import { renderAuthenticated, renderProtected } from '../../../app/routes/routeUtils';

const CreateMoversListeningTest = lazy(() => import('./listening/pages/CreateMoversListeningTestPage'));
const CreateMoversReadingPage = lazy(() => import('./reading/teacher/pages/CreateMoversReadingPage'));
const EditMoversReadingPage = lazy(() => import('./reading/teacher/pages/EditMoversReadingPage'));
const DoMoversReadingTestPage = lazy(() => import('./reading/student/pages/DoMoversReadingTestPage'));

export const buildMoversRoutes = ({ isAuthenticated }) => [
  <Route key="admin-create-movers-legacy" path="/admin/create-movers" element={renderProtected('teacher', <CreateMoversReadingPage />)} />,
  <Route key="admin-create-movers-listening" path="/admin/create-movers-listening" element={renderProtected('teacher', <CreateMoversListeningTest />)} />,
  <Route key="admin-create-movers-reading-legacy" path="/admin/create-movers-reading" element={renderProtected('teacher', <Navigate to="/admin/create/movers" replace />)} />,
  <Route key="admin-create-movers" path="/admin/create/movers" element={renderProtected('teacher', <CreateMoversReadingPage />)} />,
  <Route key="cambridge-movers-reading-edit" path="/cambridge/movers-reading/:id/edit" element={renderProtected('teacher', <EditMoversReadingPage />)} />,
  <Route key="cambridge-movers-reading" path="/cambridge/movers-reading/:id" element={renderAuthenticated(isAuthenticated, <DoMoversReadingTestPage />)} />,
];